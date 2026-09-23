from worker import celery_app
import time

@celery_app.task
def fetch_google_reviews(business_id: str):
    """
    Mock task to fetch reviews for a business.
    In a real app, this would use the Google My Business API.
    """
    # Simulate network call
    time.sleep(2)
    return {"status": "success", "business_id": business_id, "reviews_fetched": 15}

@celery_app.task
def publish_google_post(post_id: str):
    """
    Mock task to publish a post to Google Business.
    """
    # Simulate network call
    time.sleep(2)
    return {"status": "published", "post_id": post_id}
