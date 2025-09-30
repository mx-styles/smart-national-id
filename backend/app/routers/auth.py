from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from app.core import (
    get_db,
    verify_password,
    get_password_hash,
    create_access_token,
    settings,
    get_current_active_user,
    needs_password_rehash,
)
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, Token, UserLogin
from app.services.audit_service import log_audit_action
from app.models.audit_log import AuditAction
from pydantic import BaseModel

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.email == user_data.email) | (User.phone == user_data.phone)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email or phone already exists"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        phone=user_data.phone,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        national_id=user_data.national_id,
        hashed_password=hashed_password
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Log audit action
    log_audit_action(
        db=db,
        action=AuditAction.create,
        entity_type="user",
        entity_id=db_user.id,
        description=f"New user registered: {user_data.email}",
        user_id=db_user.id
    )
    
    return db_user

@router.post("/login", response_model=Token)
async def login_user(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    # Find user by email
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    # Update last login & upgrade weak hashes
    from datetime import datetime
    password_refreshed = False
    if needs_password_rehash(user.hashed_password):
        user.hashed_password = get_password_hash(form_data.password)
        password_refreshed = True

    user.last_login = datetime.utcnow()
    db.commit()
    if password_refreshed:
        db.refresh(user)
    
    # Log audit action
    log_audit_action(
        db=db,
        action=AuditAction.login,
        entity_type="user",
        entity_id=user.id,
        description=f"User logged in: {user.email}",
        user_id=user.id
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/login-email", response_model=Token)
async def login_user_email(user_data: UserLogin, db: Session = Depends(get_db)):
    # Find user by email
    user = db.query(User).filter(User.email == user_data.email).first()
    
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    # Update last login & upgrade weak hashes
    from datetime import datetime
    password_refreshed = False
    if needs_password_rehash(user.hashed_password):
        user.hashed_password = get_password_hash(user_data.password)
        password_refreshed = True

    user.last_login = datetime.utcnow()
    db.commit()
    if password_refreshed:
        db.refresh(user)
    
    # Log audit action
    log_audit_action(
        db=db,
        action=AuditAction.login,
        entity_type="user",
        entity_id=user.id,
        description=f"User logged in: {user.email}",
        user_id=user.id
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.put("/profile", response_model=UserResponse)
async def update_user_profile(
    profile_data: dict,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update user profile information"""
    # Update allowed fields - only email and phone can be changed
    allowed_fields = ['email', 'phone']
    updated_fields = []
    
    for field, value in profile_data.items():
        if field in allowed_fields and hasattr(current_user, field):
            # Check if email is being changed and if it's already taken
            if field == 'email' and value != current_user.email:
                existing_user = db.query(User).filter(User.email == value, User.id != current_user.id).first()
                if existing_user:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Email already exists"
                    )
            
            # Check if phone is being changed and if it's already taken
            if field == 'phone' and value != current_user.phone:
                existing_user = db.query(User).filter(User.phone == value, User.id != current_user.id).first()
                if existing_user:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Phone number already exists"
                    )
            
            setattr(current_user, field, value)
            updated_fields.append(field)
    
    if updated_fields:
        db.commit()
        db.refresh(current_user)
        
        # Log audit action
        log_audit_action(
            db=db,
            action=AuditAction.update,
            entity_type="user",
            entity_id=current_user.id,
            description=f"User profile updated: {', '.join(updated_fields)}",
            user_id=current_user.id
        )
    
    return current_user

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

@router.post("/change-password")
async def change_password(
    password_data: PasswordChangeRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    # Verify current password
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Validate new password
    if len(password_data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long"
        )
    
    # Update password
    current_user.hashed_password = get_password_hash(password_data.new_password)
    db.commit()
    
    # Log audit action
    log_audit_action(
        db=db,
        action=AuditAction.update,
        entity_type="user",
        entity_id=current_user.id,
        description="User password changed",
        user_id=current_user.id
    )
    
    return {"message": "Password changed successfully"}

@router.post("/logout")
async def logout_user(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Log audit action
    log_audit_action(
        db=db,
        action=AuditAction.logout,
        entity_type="user",
        entity_id=current_user.id,
        description=f"User logged out: {current_user.email}",
        user_id=current_user.id
    )
    
    return {"message": "Successfully logged out"}