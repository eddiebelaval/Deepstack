"""
FastAPI Authentication Dependency for DeepStack

Verifies Supabase JWTs to authenticate API requests.
"""

import logging
import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

logger = logging.getLogger(__name__)

# HTTP Bearer token extractor
security = HTTPBearer(auto_error=False)

# Supabase JWT configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")


class AuthenticatedUser:
    """Represents an authenticated user from a verified JWT."""

    def __init__(self, user_id: str, email: Optional[str] = None):
        self.user_id = user_id
        self.email = email


def _verify_jwt(token: str) -> Optional[AuthenticatedUser]:
    """
    Verify a Supabase JWT and extract user information.

    This uses the gotrue library if available, or falls back to
    manual JWT decoding with the SUPABASE_JWT_SECRET.
    """
    try:
        import jwt

        # Supabase uses HS256 with the JWT secret
        if not SUPABASE_JWT_SECRET:
            logger.warning("SUPABASE_JWT_SECRET not configured, auth will fail")
            return None

        # Decode and verify the JWT
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )

        # Extract user info from the JWT claims
        user_id = payload.get("sub")
        email = payload.get("email")

        if not user_id:
            logger.warning("JWT missing 'sub' claim")
            return None

        # Check expiration (jwt.decode handles this, but double-check)
        exp = payload.get("exp")
        if exp and datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(
            timezone.utc
        ):
            logger.warning("JWT has expired")
            return None

        return AuthenticatedUser(user_id=user_id, email=email)

    except jwt.ExpiredSignatureError:
        logger.warning("JWT has expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid JWT: {e}")
        return None
    except ImportError:
        logger.error("PyJWT not installed. Run: pip install pyjwt")
        return None
    except Exception as e:
        logger.error(f"JWT verification error: {e}")
        return None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> AuthenticatedUser:
    """
    FastAPI dependency that extracts and verifies the JWT from the
    Authorization header.

    Usage:
        @app.get("/protected")
        async def protected_route(user: AuthenticatedUser = Depends(get_current_user)):
            return {"user_id": user.user_id}

    Raises:
        HTTPException: 401 if no token provided or token is invalid.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = _verify_jwt(credentials.credentials)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[AuthenticatedUser]:
    """
    FastAPI dependency that optionally extracts and verifies the JWT.
    Returns None if no token is provided or token is invalid.

    Useful for routes that should work for both authenticated and
    anonymous users, but may provide additional features for authenticated users.
    """
    if credentials is None:
        return None

    return _verify_jwt(credentials.credentials)
