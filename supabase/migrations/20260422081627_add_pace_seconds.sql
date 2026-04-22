-- Add pace_seconds to sets for cardio exercises (stored as integer seconds)
ALTER TABLE sets ADD COLUMN pace_seconds INT;

-- Drop and recreate set_has_metric to include pace_seconds as a valid metric
ALTER TABLE sets DROP CONSTRAINT set_has_metric;
ALTER TABLE sets ADD CONSTRAINT set_has_metric CHECK (
  reps IS NOT NULL
  OR duration_seconds IS NOT NULL
  OR distance_meters IS NOT NULL
  OR pace_seconds IS NOT NULL
);

-- Drop and recreate positive_metrics to include pace_seconds
ALTER TABLE sets DROP CONSTRAINT positive_metrics;
ALTER TABLE sets ADD CONSTRAINT positive_metrics CHECK (
  (reps IS NULL OR reps >= 0)
  AND (weight_kg IS NULL OR weight_kg >= 0)
  AND (duration_seconds IS NULL OR duration_seconds >= 0)
  AND (distance_meters IS NULL OR distance_meters >= 0)
  AND (pace_seconds IS NULL OR pace_seconds >= 0)
);
