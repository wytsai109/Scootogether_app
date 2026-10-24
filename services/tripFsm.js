/**
 * Scootogether 2.0 - Trip Finite State Machine (FSM)
 * 
 * Manages the lifecycle of a scooter ride or carpooling trip:
 * SEARCHING -> MATCHED -> ARRIVED -> IN_TRANSIT -> COMPLETED
 *                                 \-> CANCELLED
 */

export const TripStatus = {
  SEARCHING: 'SEARCHING',
  MATCHED: 'MATCHED',
  ARRIVED: 'ARRIVED',
  IN_TRANSIT: 'IN_TRANSIT',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

const VALID_TRANSITIONS = {
  [TripStatus.SEARCHING]: [TripStatus.MATCHED, TripStatus.CANCELLED],
  [TripStatus.MATCHED]: [TripStatus.ARRIVED, TripStatus.CANCELLED],
  [TripStatus.ARRIVED]: [TripStatus.IN_TRANSIT, TripStatus.CANCELLED],
  [TripStatus.IN_TRANSIT]: [TripStatus.COMPLETED],
  [TripStatus.COMPLETED]: [],
  [TripStatus.CANCELLED]: []
};

export class TripStateMachine {
  constructor(trip) {
    this.trip = trip;
  }

  canTransitionTo(nextStatus) {
    const allowed = VALID_TRANSITIONS[this.trip.status] || [];
    return allowed.includes(nextStatus);
  }

  transition(nextStatus, metadata = {}) {
    if (!this.canTransitionTo(nextStatus)) {
      throw new Error(`Invalid state transition: Cannot change from ${this.trip.status} to ${nextStatus}`);
    }

    const previousStatus = this.trip.status;
    this.trip.status = nextStatus;
    this.trip.timeline = this.trip.timeline || [];
    this.trip.timeline.push({
      status: nextStatus,
      timestamp: new Date().toISOString(),
      metadata
    });

    if (nextStatus === TripStatus.MATCHED && metadata.driverId) {
      this.trip.driverId = metadata.driverId;
    }

    if (nextStatus === TripStatus.COMPLETED) {
      this.trip.completedAt = new Date().toISOString();
      this.trip.finalFareNTD = this.trip.estimatedFare.fareNTD;
    }

    return {
      success: true,
      previousStatus,
      currentStatus: nextStatus,
      trip: this.trip
    };
  }
}
