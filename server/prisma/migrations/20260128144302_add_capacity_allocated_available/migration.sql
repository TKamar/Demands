-- AlterTable
ALTER TABLE "Capacity" ADD COLUMN     "allocated" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "available" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Function to calculate sum of allocated (approved demands)
CREATE OR REPLACE FUNCTION calculate_allocated(capacity_id INT)
RETURNS DOUBLE PRECISION AS $$
DECLARE
    result DOUBLE PRECISION;
BEGIN
    SELECT COALESCE(SUM(d."approvedValue"), 0)
    INTO result
    FROM "Demand" d
    INNER JOIN "Capacity" c ON c.id = capacity_id
    WHERE d."locationId" = c."locationId"
      AND d."resourceName" = c."resourceName"
      AND d."resourceService" = c."resourceService"
      AND d."status" IN ('Approved', 'PartiallyApproved');

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate available (value - allocated)
CREATE OR REPLACE FUNCTION calculate_available(capacity_id INT)
RETURNS DOUBLE PRECISION AS $$
DECLARE
    cap_value DOUBLE PRECISION;
    allocated DOUBLE PRECISION;
BEGIN
    SELECT c."value" INTO cap_value
    FROM "Capacity" c
    WHERE c.id = capacity_id;

    allocated := calculate_allocated(capacity_id);

    RETURN cap_value - allocated;
END;
$$ LANGUAGE plpgsql;

-- Set initial available values to match value for existing records
UPDATE "Capacity" SET "available" = "value";
