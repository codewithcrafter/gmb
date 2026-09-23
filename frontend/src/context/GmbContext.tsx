"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";

export interface GmbStatusResponse {
  connected: boolean;
  connected_email?: string | null;
  connectedEmail?: string | null;
  expires_at?: string | null;
  expiresAt?: string | null;
  account_count?: number;
  selected_location?: SelectedLocationRecord | null;
}

export interface GoogleAccount {
  accountId: string;
  accountName: string;
  accountType: string;
}

export interface BusinessLocationItem {
  locationId: string;
  locationName: string;
  businessName: string;
  primaryCategory: string;
  address: string;
  phoneNumber?: string;
  websiteUri?: string;
  verificationState: string;
  openState?: string;
}

export interface SelectedLocationRecord {
  id?: string;
  user_id?: string;
  account_id: string;
  location_id: string;
  location_name: string;
  address?: string;
  primary_category?: string;
  verification_state?: string;
  updated_at?: string;
}

interface GmbContextType {
  connected: boolean;
  connectedEmail: string | null;
  expiresAt: string | null;
  accountCount: number;
  loading: boolean;
  error: string | null;

  accounts: GoogleAccount[];
  locations: BusinessLocationItem[];
  selectedLocation: SelectedLocationRecord | null;
  selectedAccount: GoogleAccount | null;
  loadingAccounts: boolean;
  loadingLocations: boolean;

  connect: () => Promise<void>;
  checkStatus: () => Promise<void>;
  handleCallback: (code: string) => Promise<void>;
  fetchAccounts: () => Promise<GoogleAccount[]>;
  fetchLocations: (accountId: string) => Promise<BusinessLocationItem[]>;
  selectLocation: (location: {
    account_id: string;
    location_id: string;
    location_name: string;
    address?: string;
    primary_category?: string;
  }) => Promise<void>;
  fetchCurrentLocation: () => Promise<SelectedLocationRecord | null>;
  disconnectGoogle: () => Promise<void>;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const GmbContext = createContext<GmbContextType | undefined>(undefined);

export const GmbProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();

  const [connected, setConnected] = useState<boolean>(false);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [accountCount, setAccountCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [locations, setLocations] = useState<BusinessLocationItem[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocationRecord | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<GoogleAccount | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState<boolean>(false);
  const [loadingLocations, setLoadingLocations] = useState<boolean>(false);

  const fetchCurrentLocation = useCallback(async (): Promise<SelectedLocationRecord | null> => {
    if (!user) {
      setSelectedLocation(null);
      return null;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/gmb/current-location`, {
        method: "GET",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const curr = data.selected || null;
        setSelectedLocation(curr);
        return curr;
      }
    } catch (err) {
      console.error("Error fetching current location:", err);
    }
    return null;
  }, [user]);

  const checkStatus = useCallback(async () => {
    if (!user) {
      setConnected(false);
      setConnectedEmail(null);
      setExpiresAt(null);
      setAccountCount(0);
      setSelectedLocation(null);
      setAccounts([]);
      setLocations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/gmb/status`, {
        method: "GET",
        credentials: "include",
      });

      if (res.ok) {
        const data: GmbStatusResponse = await res.json();
        const isConnected = Boolean(data.connected);

        setConnected(isConnected);
        setConnectedEmail(data.connected_email || data.connectedEmail || null);
        setExpiresAt(data.expires_at || data.expiresAt || null);
        setAccountCount(data.account_count || 0);

        if (isConnected) {
          if (data.selected_location) {
            setSelectedLocation(data.selected_location);
          } else {
            await fetchCurrentLocation();
          }
        } else {
          setSelectedLocation(null);
          setAccounts([]);
          setLocations([]);
        }
      } else {
        setConnected(false);
        setConnectedEmail(null);
        setExpiresAt(null);
        setAccountCount(0);
        setSelectedLocation(null);
        setAccounts([]);
        setLocations([]);
      }
    } catch (err: any) {
      console.error("Error checking GMB status:", err);
      setConnected(false);
      setConnectedEmail(null);
      setExpiresAt(null);
      setAccountCount(0);
      setSelectedLocation(null);
    } finally {
      setLoading(false);
    }
  }, [user, fetchCurrentLocation]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const connect = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/gmb/connect`, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to initiate Google OAuth connection.");
      const { auth_url } = await res.json();

      // Always redirect to Google's real OAuth authorization endpoint
      window.location.href = auth_url;
    } catch (err: any) {
      setError(err.message || "Failed to start Google connection.");
      setLoading(false);
    }
  }, []);

  const handleCallback = useCallback(async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/gmb/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Google OAuth callback failed.");
      }

      // DO NOT set connected state directly from transient local data.
      // ALWAYS read persisted OAuth status directly from GET /api/gmb/status in DB!
      await checkStatus();
    } catch (err: any) {
      setError(err.message || "Error processing Google callback.");
      setConnected(false);
      setConnectedEmail(null);
      setExpiresAt(null);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [checkStatus]);


  const fetchLocations = useCallback(async (accountId: string): Promise<BusinessLocationItem[]> => {
    setLoadingLocations(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/gmb/accounts/${encodeURIComponent(accountId)}/locations`, {
        method: "GET",
        credentials: "include",
      });

      if (res.ok) {
        const locs: BusinessLocationItem[] = await res.json();
        setLocations(locs);
        setLoadingLocations(false);

        // Auto-select requirement: If only ONE location exists, automatically select it!
        if (locs.length === 1) {
          const single = locs[0];
          await fetch(`${API_BASE_URL}/api/gmb/select-location`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              account_id: accountId,
              location_id: single.locationId,
              location_name: single.businessName,
              address: single.address,
              primary_category: single.primaryCategory,
            }),
          });
          setSelectedLocation({
            account_id: accountId,
            location_id: single.locationId,
            location_name: single.businessName,
            address: single.address,
            primary_category: single.primaryCategory,
            verification_state: single.verificationState,
          });
        }
        return locs;
      }
    } catch (err) {
      console.error("Error fetching locations:", err);
    } finally {
      setLoadingLocations(false);
    }
    return [];
  }, []);

  const fetchAccounts = useCallback(async (): Promise<GoogleAccount[]> => {
    setLoadingAccounts(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/gmb/accounts`, {
        method: "GET",
        credentials: "include",
      });

      if (res.ok) {
        const accs: GoogleAccount[] = await res.json();
        setAccounts(accs);
        if (accs.length > 0) {
          setSelectedAccount(accs[0]);
          await fetchLocations(accs[0].accountId);
        }
        setLoadingAccounts(false);
        return accs;
      }
    } catch (err) {
      console.error("Error fetching accounts:", err);
    } finally {
      setLoadingAccounts(false);
    }
    return [];
  }, [fetchLocations]);

  useEffect(() => {
    if (connected && accounts.length === 0 && !loadingAccounts) {
      fetchAccounts();
    }
  }, [connected, accounts.length, loadingAccounts, fetchAccounts]);

  const selectLocation = useCallback(async (locData: {
    account_id: string;
    location_id: string;
    location_name: string;
    address?: string;
    primary_category?: string;
  }) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/gmb/select-location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(locData),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.selected) {
          setSelectedLocation(data.selected);
        } else {
          setSelectedLocation({
            account_id: locData.account_id,
            location_id: locData.location_id,
            location_name: locData.location_name,
            address: locData.address,
            primary_category: locData.primary_category,
          });
        }
      }
    } catch (err) {
      console.error("Error selecting location:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnectGoogle = useCallback(async () => {
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/api/gmb/disconnect`, {
        method: "POST",
        credentials: "include",
      });
      setConnected(false);
      setConnectedEmail(null);
      setExpiresAt(null);
      setAccounts([]);
      setLocations([]);
      setSelectedLocation(null);
      setSelectedAccount(null);
    } catch (err) {
      console.error("Error disconnecting Google account:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <GmbContext.Provider
      value={{
        connected,
        connectedEmail,
        expiresAt,
        accountCount,
        loading,

        error,
        accounts,
        locations,
        selectedLocation,
        selectedAccount,
        loadingAccounts,
        loadingLocations,
        connect,
        checkStatus,
        handleCallback,
        fetchAccounts,
        fetchLocations,
        selectLocation,
        fetchCurrentLocation,
        disconnectGoogle,
      }}
    >
      {children}
    </GmbContext.Provider>
  );
};

export const useGmb = () => {
  const context = useContext(GmbContext);
  if (!context) {
    throw new Error("useGmb must be used within a GmbProvider");
  }
  return context;
};
