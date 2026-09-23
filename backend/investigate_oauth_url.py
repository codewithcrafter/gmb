import gmb_service

def run():
    url = gmb_service.get_google_auth_url()
    print("OAuth URL:")
    print(url)

if __name__ == "__main__":
    run()
