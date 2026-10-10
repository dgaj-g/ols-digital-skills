/* =====================================================================
   Try it - chapter 7, Bookings.
   Each section between -- [try:name] and -- [/try] stands on its own:
   paste ONE section into a new query window in SSMS and press F5.
   Every section works on the TEST DAY: tomorrow, or Monday if tomorrow
   is a Sunday, so nothing you book is in the past or on a Sunday.
   A procedure that refuses hands back a sentence in @Message.
   When @Message is blank, it worked.
   ===================================================================== */
USE BikeShop;
GO

-- [try:good]
-- Book Aoife (mechanic 3) for a basic service (service 6) at 13:00 on the test
-- day.
-- Run it once: it books.  Run it again: the same slot is refused.
DECLARE @Day DATE, @Start DATETIME, @NewID INT, @Message VARCHAR(200);
-- tomorrow
SET @Day = DATEADD(DAY, 1, CAST(GETDATE() AS DATE));
-- the workshop is shut on Sundays
IF DATENAME(WEEKDAY, @Day) = 'Sunday' SET @Day = DATEADD(DAY, 1, @Day);
-- 13:00 on the test day
SET @Start = DATEADD(HOUR, 13, CAST(@Day AS DATETIME));

EXEC usp_Appointment_Add
     @CustomerID = 1, @MechanicID = 3, @ServiceTypeID = 6, @StartTime = @Start,
     @BikeDescription = 'Blue Trek hybrid', @Notes = NULL, @BookedByStaffID = 2,
     @NewAppointmentID = @NewID OUTPUT, @Message = @Message OUTPUT;

IF @Message = ''
BEGIN
    PRINT 'Booked. New appointment number ' + CAST(@NewID AS VARCHAR) + ' at '
        + CAST(CAST(@Start AS TIME) AS VARCHAR(5)) + ' on '
        + CAST(@Day AS VARCHAR) + '.';
END
ELSE
BEGIN
    PRINT @Message;
END
-- [/try]

-- [try:move]
-- Book Aoife at 15:00, then move that booking three times: onto itself, to
-- 15:15, and onto her 13:00 booking.
DECLARE @Day DATE, @Start DATETIME, @B INT, @Message VARCHAR(200);
SET @Day = DATEADD(DAY, 1, CAST(GETDATE() AS DATE));
IF DATENAME(WEEKDAY, @Day) = 'Sunday' SET @Day = DATEADD(DAY, 1, @Day);
-- 15:00 on the test day
SET @Start = DATEADD(HOUR, 15, CAST(@Day AS DATETIME));

EXEC usp_Appointment_Add
     @CustomerID = 2, @MechanicID = 3, @ServiceTypeID = 6, @StartTime = @Start,
     @BikeDescription = 'Black Giant road bike', @Notes = NULL,
         @BookedByStaffID = 2,
     @NewAppointmentID = @B OUTPUT, @Message = @Message OUTPUT;
IF @Message <> ''
BEGIN
    PRINT 'Could not make the 15:00 booking: ' + @Message;
    -- stop here
    RETURN;
END
PRINT 'Booked number ' + CAST(@B AS VARCHAR) + ' at 15:00.';

-- 1. Onto its own time: a booking never clashes with itself.
EXEC usp_Appointment_Move @AppointmentID = @B, @NewStartTime = @Start,
    @Message = @Message OUTPUT;
IF @Message = ''
BEGIN
    PRINT 'Moved onto itself: allowed.';
END
ELSE
BEGIN
    PRINT 'Moved onto itself: ' + @Message;
END

-- 2. To 15:15: the only booking it overlaps is itself, so still allowed.
SET @Start = DATEADD(MINUTE, 15, @Start);
EXEC usp_Appointment_Move @AppointmentID = @B, @NewStartTime = @Start,
    @Message = @Message OUTPUT;
IF @Message = ''
BEGIN
    PRINT 'Moved to 15:15: allowed.';
END
ELSE
BEGIN
    PRINT 'Moved to 15:15: ' + @Message;
END

-- 3. To 13:30: inside the 13:00 booking from the first section, so refused.
SET @Start = DATEADD(HOUR, 13, CAST(@Day AS DATETIME));
SET @Start = DATEADD(MINUTE, 30, @Start);
EXEC usp_Appointment_Move @AppointmentID = @B, @NewStartTime = @Start,
    @Message = @Message OUTPUT;
IF @Message = ''
BEGIN
    PRINT 'Moved to 13:30: allowed. (Run the first section first and this ' +
        'move is refused.)';
END
ELSE BEGIN PRINT 'Move to 13:30 refused: ' + @Message; END
-- [/try]

-- [try:cancel]
-- Cancel one booking by its number, then look at the day: the row is still
-- there, marked Cancelled.
DECLARE @ID INT, @Day DATE, @Message VARCHAR(200);
-- <-- put the number that the first section printed for you here
SET @ID = 0;

EXEC usp_Appointment_Cancel @AppointmentID = @ID, @Message = @Message OUTPUT;
IF @Message = ''
BEGIN
    PRINT 'Cancelled number ' + CAST(@ID AS VARCHAR)
        + '. It is still in the diary, marked Cancelled.';
END
ELSE BEGIN PRINT @Message; END

SET @Day = DATEADD(DAY, 1, CAST(GETDATE() AS DATE));
IF DATENAME(WEEKDAY, @Day) = 'Sunday' SET @Day = DATEADD(DAY, 1, @Day);
EXEC usp_Appointment_GetByDay @Day = @Day;
-- [/try]

-- [try:free]
-- Who is free at 13:00 on the test day for a basic service?  After the first
-- section, Aoife is missing from the list.
DECLARE @Day DATE, @Start DATETIME;
SET @Day = DATEADD(DAY, 1, CAST(GETDATE() AS DATE));
IF DATENAME(WEEKDAY, @Day) = 'Sunday' SET @Day = DATEADD(DAY, 1, @Day);
SET @Start = DATEADD(HOUR, 13, CAST(@Day AS DATETIME));

EXEC usp_Appointment_GetFreeMechanics @StartTime = @Start, @ServiceTypeID = 6;
-- [/try]

-- [try:hire]
-- Hire bike 1 to customer 1 for three days, starting ten days from now.  Then
-- try the same bike for dates that overlap.
DECLARE @From DATE, @To DATE, @H INT, @Message VARCHAR(200);
SET @From = DATEADD(DAY, 10, CAST(GETDATE() AS DATE));
SET @To = DATEADD(DAY, 3, @From);

EXEC usp_Hire_Add @BikeID = 1, @CustomerID = 1, @StartDate = @From,
    @EndDate = @To,
     @DepositPaid = 50, @BookedByStaffID = 2, @NewHireID = @H OUTPUT,
         @Message = @Message OUTPUT;
IF @Message = ''
BEGIN
    PRINT 'Hired. New hire number ' + CAST(@H AS VARCHAR) + ' from '
        + CAST(@From AS VARCHAR) + ' for 3 days.';
END
ELSE BEGIN PRINT 'Hire refused: ' + @Message; END

-- The same bike again, starting the day before that hire ends: the dates
-- overlap, so it must be refused.
SET @From = DATEADD(DAY, 2, @From);
SET @To = DATEADD(DAY, 3, @From);
EXEC usp_Hire_Add @BikeID = 1, @CustomerID = 2, @StartDate = @From,
    @EndDate = @To,
     @DepositPaid = 50, @BookedByStaffID = 2, @NewHireID = @H OUTPUT,
         @Message = @Message OUTPUT;
IF @Message = ''
BEGIN
    PRINT 'The overlapping hire got through: the rule is broken.';
END
ELSE BEGIN PRINT 'Overlapping hire refused: ' + @Message; END
-- [/try]
