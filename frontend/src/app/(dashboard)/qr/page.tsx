"use client";

import React, { useState } from "react";
import { QrCode, Download, Link2, Copy, Check } from "lucide-react";
import { useGmb } from "@/context/GmbContext";

export default function QrGeneratorPage() {
  const { selectedLocation } = useGmb();
  const [copied, setCopied] = useState(false);

  // If we don't have a placeId, we fallback to a Google search for the business name.
  // In a full implementation, you would retrieve the Google Maps Place ID from the GMB API.
  const businessName = selectedLocation?.location_name || "Business Name";
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(businessName)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(searchUrl)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(searchUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Magic QR Generator</h1>
          <p className="text-xs text-slate-500">Generate review links and QR codes for {businessName}.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Generator Setup */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">Destination URL</h2>
            <p className="text-xs text-slate-500 mb-3">This is where the QR code will send customers.</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <Link2 className="w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  value={searchUrl} 
                  readOnly 
                  className="bg-transparent border-none outline-none text-xs text-slate-600 w-full"
                />
              </div>
              <button 
                onClick={handleCopy}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                title="Copy Link"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Customize Display</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" defaultChecked />
                Include Business Logo
              </label>
              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" defaultChecked />
                Add "Scan to Review" text
              </label>
            </div>
          </div>
        </div>

        {/* Preview & Download */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-8 shadow-sm flex flex-col items-center justify-center space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="QR Code" className="w-48 h-48" />
          </div>
          
          <div className="text-center">
            <h3 className="font-bold text-slate-900">{businessName}</h3>
            <p className="text-xs text-slate-500 mt-1">Scan this code to leave a review</p>
          </div>

          <div className="flex gap-3">
            <a 
              href={qrUrl} 
              download="business-qr-code.png"
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
            >
              <Download className="w-4 h-4" /> Download QR Code
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
