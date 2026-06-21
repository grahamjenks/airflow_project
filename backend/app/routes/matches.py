from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Match, User
from app.schemas import MatchCreate, MatchOut, MatchUpdate
from app.security import get_current_user


router = APIRouter(prefix="/matches", tags=["matches"])


def _to_out(row: Match) -> MatchOut:
    return MatchOut(
        id=row.id,
        matchData=row.match_data,
        battingStats=row.batting_stats,
        bowlingStats=row.bowling_stats,
        deliveries=row.deliveries,
        scorecardState=row.scorecard_state,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _get_owned_match_or_404(match_id: uuid.UUID, db: Session, user: User) -> Match:
    row = (
        db.query(Match)
        .filter(Match.id == match_id, Match.owner_id == user.id)
        .one_or_none()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return row


@router.get("", response_model=List[MatchOut])
def list_matches(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    limit: int = 200,
):
    limit = max(1, min(limit, 500))
    rows = (
        db.query(Match)
        .filter(Match.owner_id == user.id)
        .order_by(Match.updated_at.desc())
        .limit(limit)
        .all()
    )
    return [_to_out(row) for row in rows]


@router.get("/{match_id}", response_model=MatchOut)
def get_match(
    match_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _to_out(_get_owned_match_or_404(match_id, db, user))


@router.post("", response_model=MatchOut, status_code=status.HTTP_201_CREATED)
def create_match(
    body: MatchCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = Match(
        id=body.id or uuid.uuid4(),
        owner_id=user.id,
        match_data=body.matchData,
        batting_stats=body.battingStats,
        bowling_stats=body.bowlingStats,
        deliveries=body.deliveries,
        scorecard_state=body.scorecardState,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.put("/{match_id}", response_model=MatchOut)
def update_match(
    match_id: uuid.UUID,
    body: MatchUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = _get_owned_match_or_404(match_id, db, user)

    row.match_data = body.matchData
    row.batting_stats = body.battingStats
    row.bowling_stats = body.bowlingStats
    row.deliveries = body.deliveries
    row.scorecard_state = body.scorecardState
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.delete("/{match_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_match(
    match_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = (
        db.query(Match)
        .filter(Match.id == match_id, Match.owner_id == user.id)
        .one_or_none()
    )
    if not row:
        return
    db.delete(row)
    db.commit()
