import os
import uuid
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Header
from fastapi.responses import FileResponse
from typing import Optional
import shutil

router = APIRouter(prefix="/uploads", tags=["uploads"])

# Directory to store uploaded files
UPLOAD_DIR = Path("uploads")
PROFILE_PICTURES_DIR = UPLOAD_DIR / "profile-pictures"

# Ensure directories exist
UPLOAD_DIR.mkdir(exist_ok=True)
PROFILE_PICTURES_DIR.mkdir(exist_ok=True, parents=True)

# Allowed image MIME types
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    user_uid: str = Header(..., alias="X-User-UID", description="UID of the user uploading the image")
):
    """
    Upload a profile picture for a user.
    Returns the URL path to access the uploaded image.
    """
    try:
        # Validate file type
        if file.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_IMAGE_TYPES)}"
            )

        # Read file content to check size
        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE / (1024 * 1024)}MB"
            )

        # Create user-specific directory
        user_dir = PROFILE_PICTURES_DIR / user_uid
        user_dir.mkdir(exist_ok=True, parents=True)

        # Generate unique filename
        file_extension = Path(file.filename).suffix or ".jpg"
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = user_dir / unique_filename

        # Save file
        with open(file_path, "wb") as f:
            f.write(contents)

        # Return the URL path (relative to /uploads)
        url_path = f"/api/v1/uploads/profile-pictures/{user_uid}/{unique_filename}"
        
        return {
            "success": True,
            "url": url_path,
            "filename": unique_filename,
            "message": "Profile picture uploaded successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading profile picture: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload profile picture: {str(e)}")


@router.get("/profile-pictures/{user_uid}/{filename}")
async def get_profile_picture(user_uid: str, filename: str):
    """
    Serve a profile picture file.
    """
    try:
        file_path = PROFILE_PICTURES_DIR / user_uid / filename
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Profile picture not found")
        
        # Determine content type from file extension
        content_type = "image/jpeg"
        if filename.lower().endswith(".png"):
            content_type = "image/png"
        elif filename.lower().endswith(".gif"):
            content_type = "image/gif"
        elif filename.lower().endswith(".webp"):
            content_type = "image/webp"
        
        return FileResponse(
            file_path,
            media_type=content_type,
            filename=filename
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error serving profile picture: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to serve profile picture: {str(e)}")


@router.delete("/profile-picture/{user_uid}")
async def delete_profile_picture(
    user_uid: str,
    requesting_uid: str = Header(..., alias="X-User-UID", description="UID of the user requesting deletion")
):
    """
    Delete all profile pictures for a user (only the user themselves can delete).
    """
    try:
        # Only allow users to delete their own pictures
        if user_uid != requesting_uid:
            raise HTTPException(status_code=403, detail="You can only delete your own profile pictures")
        
        user_dir = PROFILE_PICTURES_DIR / user_uid
        
        if user_dir.exists():
            # Delete all files in the user's directory
            shutil.rmtree(user_dir)
        
        return {
            "success": True,
            "message": "Profile pictures deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting profile picture: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete profile picture: {str(e)}")

