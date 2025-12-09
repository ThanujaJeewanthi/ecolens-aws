import json
import boto3
import base64
from botocore.exceptions import ClientError

# Initialize the Boto3 Rekognition client outside the handler
# This improves performance by keeping the client connection warm
rekognition = boto3.client('rekognition')

# The primary Lambda function handler
def lambda_handler(event, context):
    print("Received event:", json.dumps(event))

    try:
        # 1. Parse the request body (input from API Gateway)
        # We expect a JSON body with a 'base64Image' field
        body = json.loads(event['body'])
        base64_image = body.get('base64Image')

        if not base64_image:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Missing 'base64Image' in request body."}),
                "headers": {"Content-Type": "application/json"}
            }

        # 2. Decode the Base64 image data
        image_bytes = base64.b64decode(base64_image)

        # 3. Call Amazon Rekognition
        # We pass the image bytes directly to the API
        rekognition_response = rekognition.detect_labels(
            Image={'Bytes': image_bytes},
            # MinConfidence is a Free Tier best practice to save on calls 
            # by filtering out low-quality results.
            MinConfidence=70, 
            MaxLabels=10
        )

        # 4. Process the results for 'EcoLens'
        # Filter the relevant labels (e.g., 'Bottle', 'Can', 'Plastic')
        labels = [
            {'Name': label['Name'], 'Confidence': round(label['Confidence'], 2)}
            for label in rekognition_response['Labels']
        ]
        
        # Simple Logic to determine 'Recycle' status (we'll make this smarter later)
        # For Phase 4, we just return the raw labels.
        
        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "AI analysis complete.",
                "labels": labels,
                "input_size_bytes": len(image_bytes)
            }),
            "headers": {
                "Content-Type": "application/json",
                # CORS headers for the frontend (Crucial for Phase 5)
                "Access-Control-Allow-Origin": "*" 
            }
        }

    except ClientError as e:
        # Handle AWS API-specific errors (e.g., image too large, permissions denied)
        return {
            "statusCode": 500,
            "body": json.dumps({"error": f"Rekognition Client Error: {e.response['Error']['Message']}"}),
            "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"}
        }

    except Exception as e:
        # Handle general errors
        print(f"General error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": f"An unexpected error occurred: {str(e)}"}),
            "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"}
        }