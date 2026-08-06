"""
Domain layer — entities and value objects, previously an empty placeholder
package (docs/audits/GLADE-DEMO-GROUNDED-STATE-2026-08-06.md §3).
"""

from app.domain.entities import CaseEntity, UserEntity
from app.domain.value_objects import CaseStatus, UserRole

__all__ = ["CaseEntity", "CaseStatus", "UserEntity", "UserRole"]
