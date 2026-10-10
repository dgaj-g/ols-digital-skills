/* =====================================================================
   BikeShop.tests.sql  -  proves the rules in BikeShop.sql.
   Run BikeShop.sql first (fresh data), then run this whole file (F5).
   Every line printed starts PASS or FAIL.  A CONTROL is a test that
   MUST be refused: if a control gets through, the rule is broken.
   A procedure that refuses hands back a sentence in @Message.
   When @Message is blank, it worked.
   The tests change the data, so run BikeShop.sql again afterwards to
   put the sample data back.
   ===================================================================== */
USE BikeShop;
GO

DECLARE @Pass INT, @Fail INT, @ID INT, @Message VARCHAR(200);
SET @Pass = 0;
SET @Fail = 0;

-- The test day: tomorrow, or Monday if tomorrow is a Sunday (never today, never
-- a Sunday).
DECLARE @TestDay DATE, @D DATETIME;
SET @TestDay = DATEADD(DAY, 1, CAST(GETDATE() AS DATE));
IF DATENAME(WEEKDAY, @TestDay) = 'Sunday' SET @TestDay = DATEADD(DAY, 1,
    @TestDay);
SET @D = CAST(@TestDay AS DATETIME);                    -- the test day at 00:00
PRINT 'Test day: ' + DATENAME(WEEKDAY, @TestDay) + ' '
    + CAST(@TestDay AS VARCHAR);

-- The times used below, all on the test day.
DECLARE @T1230 DATETIME, @T1300 DATETIME, @T1330 DATETIME, @T1400 DATETIME,
    @T1700 DATETIME;
SET @T1300 = DATEADD(HOUR, 13, @D);
SET @T1230 = DATEADD(MINUTE, -30, @T1300);
SET @T1330 = DATEADD(MINUTE, 30, @T1300);
SET @T1400 = DATEADD(HOUR, 1, @T1300);
SET @T1700 = DATEADD(HOUR, 4, @T1300);

/* ================= BOOKINGS: no double booking ================= */

/* ---- 1. CONTROL: a booking at 00:00 is outside opening hours ---- */
EXEC usp_Appointment_Add @CustomerID = 1, @MechanicID = 3, @ServiceTypeID = 6,
    @StartTime = @D,
     @BikeDescription = 'Test bike', @Notes = NULL, @BookedByStaffID = 2,
     @NewAppointmentID = @ID OUTPUT, @Message = @Message OUTPUT;
IF @Message <> ''
     BEGIN PRINT 'PASS 1 (control): 00:00 refused: ' + @Message + '';
         SET @Pass = @Pass + 1; END
ELSE BEGIN PRINT 'FAIL 1 (control): a booking at 00:00 got through';
    SET @Fail = @Fail + 1; END

/* ---- 2. A booking in a free slot is accepted ---- */
-- Aoife = 3, basic service = 6, 13:00 to 14:00.
DECLARE @FirstID INT;
EXEC usp_Appointment_Add @CustomerID = 1, @MechanicID = 3, @ServiceTypeID = 6,
    @StartTime = @T1300,
     @BikeDescription = 'Test bike', @Notes = NULL, @BookedByStaffID = 2,
     @NewAppointmentID = @FirstID OUTPUT, @Message = @Message OUTPUT;
IF @Message = ''
     BEGIN PRINT 'PASS 2: free slot 13:00 to 14:00 accepted, new number '
         + CAST(@FirstID AS VARCHAR) + ''; SET @Pass = @Pass + 1; END
ELSE BEGIN PRINT 'FAIL 2: free slot refused: ' + @Message + '';
    SET @Fail = @Fail + 1; END

/* ---- 3. CONTROL: the same slot again must be refused ---- */
EXEC usp_Appointment_Add @CustomerID = 2, @MechanicID = 3, @ServiceTypeID = 6,
    @StartTime = @T1300,
     @BikeDescription = 'Clash bike', @Notes = NULL, @BookedByStaffID = 2,
     @NewAppointmentID = @ID OUTPUT, @Message = @Message OUTPUT;
IF @Message <> ''
     BEGIN PRINT 'PASS 3 (control): exact double booking refused: ' + @Message
         + ''; SET @Pass = @Pass + 1; END
ELSE BEGIN PRINT 'FAIL 3 (control): exact double booking got through';
    SET @Fail = @Fail + 1; END

/* ---- 4. CONTROL: a start in the middle of another booking is refused ---- */
-- 13:30, inside the 13:00 to 14:00 booking.
EXEC usp_Appointment_Add @CustomerID = 2, @MechanicID = 3, @ServiceTypeID = 1,
    @StartTime = @T1330,
     @BikeDescription = 'Clash bike', @Notes = NULL, @BookedByStaffID = 2,
     @NewAppointmentID = @ID OUTPUT, @Message = @Message OUTPUT;
IF @Message <> ''
     BEGIN PRINT 'PASS 4 (control): 13:30 inside 13:00 to 14:00 refused: '
         + @Message + ''; SET @Pass = @Pass + 1; END
ELSE BEGIN PRINT 'FAIL 4 (control): a booking inside another got through';
    SET @Fail = @Fail + 1; END

/* ---- 5. CONTROL: an end in the middle of another booking is refused ---- */
-- 12:30 to 13:30, ending inside the 13:00 to 14:00 booking.
EXEC usp_Appointment_Add @CustomerID = 2, @MechanicID = 3, @ServiceTypeID = 6,
    @StartTime = @T1230,
     @BikeDescription = 'Clash bike', @Notes = NULL, @BookedByStaffID = 2,
     @NewAppointmentID = @ID OUTPUT, @Message = @Message OUTPUT;
IF @Message <> ''
     BEGIN PRINT 'PASS 5 (control): 12:30 to 13:30 overlapping the start ' +
         'refused: ' + @Message + ''; SET @Pass = @Pass + 1; END
ELSE BEGIN PRINT 'FAIL 5 (control): a booking overlapping the start got ' +
    'through'; SET @Fail = @Fail + 1; END

/* ---- 6. Touching is not clashing ---- */
-- 14:00 is exactly when the first booking ends, so it is allowed.
DECLARE @MoveID INT;
EXEC usp_Appointment_Add @CustomerID = 2, @MechanicID = 3, @ServiceTypeID = 1,
    @StartTime = @T1400,
     @BikeDescription = 'Next bike', @Notes = NULL, @BookedByStaffID = 2,
     @NewAppointmentID = @MoveID OUTPUT, @Message = @Message OUTPUT;
IF @Message = ''
     BEGIN PRINT 'PASS 6: booking that starts as the other ends accepted';
         SET @Pass = @Pass + 1; END
ELSE BEGIN PRINT 'FAIL 6: touching booking refused: ' + @Message + '';
    SET @Fail = @Fail + 1; END

/* ---- 7. Another mechanic (Conor = 4) at the same time is fine ---- */
EXEC usp_Appointment_Add @CustomerID = 3, @MechanicID = 4, @ServiceTypeID = 6,
    @StartTime = @T1300,
     @BikeDescription = 'Red bike', @Notes = NULL, @BookedByStaffID = 2,
     @NewAppointmentID = @ID OUTPUT, @Message = @Message OUTPUT;
IF @Message = ''
     BEGIN PRINT 'PASS 7: another mechanic at 13:00 accepted';
         SET @Pass = @Pass + 1; END
ELSE BEGIN PRINT 'FAIL 7: another mechanic at 13:00 refused: ' + @Message + '';
    SET @Fail = @Fail + 1; END

/* ---- 8. Cancelling keeps the row but frees the slot ---- */
EXEC usp_Appointment_Cancel @AppointmentID = @FirstID,
    @Message = @Message OUTPUT;
IF @Message = ''
    AND (SELECT Status FROM Appointment WHERE AppointmentID = @FirstID) =
    'Cancelled'
     BEGIN PRINT 'PASS 8a: cancelled booking is still in the table, marked ' +
         'Cancelled'; SET @Pass = @Pass + 1; END
ELSE BEGIN PRINT 'FAIL 8a: cancel went wrong: ' + @Message + '';
    SET @Fail = @Fail + 1; END
DECLARE @ReuseID INT;
EXEC usp_Appointment_Add @CustomerID = 4, @MechanicID = 3, @ServiceTypeID = 6,
    @StartTime = @T1300,
     @BikeDescription = 'Reuse bike', @Notes = NULL, @BookedByStaffID = 2,
     @NewAppointmentID = @ReuseID OUTPUT, @Message = @Message OUTPUT;
IF @Message = ''
     BEGIN PRINT 'PASS 8b: the freed slot can be booked again';
         SET @Pass = @Pass + 1; END
ELSE BEGIN PRINT 'FAIL 8b: freed slot still blocked: ' + @Message + '';
    SET @Fail = @Fail + 1; END

/* ---- 9. CONTROL: a 60-minute service at 17:00 would end after closing ---- */
EXEC usp_Appointment_Add @CustomerID = 1, @MechanicID = 5, @ServiceTypeID = 6,
    @StartTime = @T1700,
     @BikeDescription = 'Late bike', @Notes = NULL, @BookedByStaffID = 2,
     @NewAppointmentID = @ID OUTPUT, @Message = @Message OUTPUT;
IF @Message <> ''
     BEGIN PRINT 'PASS 9 (control): booking past closing time refused: '
         + @Message + ''; SET @Pass = @Pass + 1; END
ELSE BEGIN PRINT 'FAIL 9 (control): a booking past closing time got through';
    SET @Fail = @Fail + 1; END

/* ---- 10. CONTROL: no bookings on a Sunday ---- */
-- 6 January 2030 is a Sunday.
DECLARE @Sunday DATETIME;
SET @Sunday = '2030-01-06 10:00';
EXEC usp_Appointment_Add @CustomerID = 1, @MechanicID = 5, @ServiceTypeID = 6,
    @StartTime = @Sunday,
     @BikeDescription = 'Sunday bike', @Notes = NULL, @BookedByStaffID = 2,
     @NewAppointmentID = @ID OUTPUT, @Message = @Message OUTPUT;
IF @Message <> ''
     BEGIN PRINT 'PASS 10 (control): Sunday booking refused: ' + @Message + '';
         SET @Pass = @Pass + 1; END
ELSE BEGIN PRINT 'FAIL 10 (control): a Sunday booking got through';
    SET @Fail = @Fail + 1; END

/* ---- 11. Moving a booking ---- */
-- Onto its own time is allowed; onto another booking is refused.
EXEC usp_Appointment_Move @AppointmentID = @ReuseID, @NewStartTime = @T1300,
    @Message = @Message OUTPUT;
IF @Message = ''
     BEGIN PRINT 'PASS 11a: a booking may be moved onto its own time';
         SET @Pass = @Pass + 1; END
ELSE BEGIN PRINT 'FAIL 11a: move onto its own time refused: ' + @Message + '';
    SET @Fail = @Fail + 1; END
EXEC usp_Appointment_Move @AppointmentID = @MoveID, @NewStartTime = @T1330,
    @Message = @Message OUTPUT;
IF @Message <> ''
     BEGIN PRINT 'PASS 11b (control): move onto another booking refused: '
         + @Message + ''; SET @Pass = @Pass + 1; END
ELSE BEGIN PRINT 'FAIL 11b (control): a move onto another booking got through';
    SET @Fail = @Fail + 1; END

/* ---- 12. The free-mechanics list at 13:00 ---- */
-- Leaves out Aoife (3) and Conor (4); keeps Niamh (5).
-- a table that lives only while this script runs
DECLARE @Free TABLE (StaffID INT, FullName VARCHAR(81));
INSERT INTO @Free EXEC usp_Appointment_GetFreeMechanics @StartTime = @T1300,
    @ServiceTypeID = 1;
IF EXISTS (SELECT * FROM @Free WHERE StaffID = 5)
    AND NOT EXISTS (SELECT * FROM @Free WHERE StaffID IN (3, 4))
     BEGIN PRINT 'PASS 12: free list at 13:00 has Niamh and not Aoife or Conor';
         SET @Pass = @Pass + 1; END
ELSE BEGIN PRINT 'FAIL 12: free list at 13:00 is wrong'; SET @Fail = @Fail + 1;
    END

/* ================= HIRES: a bike is never out twice ================= */
-- Bike 1 is already hired from 3 to 6 days ahead and from 6 to 8 days ahead
-- (sample data).
DECLARE @Today DATE, @From DATE, @To DATE, @HireID INT;
SET @Today = CAST(GETDATE() AS DATE);

/* ---- 13. CONTROL: dates inside an existing hire must be refused ---- */
SET @From = DATEADD(DAY, 4, @Today);
SET @To = DATEADD(DAY, 5, @Today);
EXEC usp_Hire_Add @BikeID = 1, @CustomerID = 1, @StartDate = @From,
    @EndDate = @To, @DepositPaid = 50,
     @BookedByStaffID = 2, @NewHireID = @HireID OUTPUT,
         @Message = @Message OUTPUT;
IF @Message <> ''
     BEGIN PRINT 'PASS 13 (control): overlapping hire refused: ' + @Message
         + ''; SET @Pass = @Pass + 1; END
ELSE BEGIN PRINT 'FAIL 13 (control): an overlapping hire got through';
    SET @Fail = @Fail + 1; END

/* ---- 14. Starting the day the last hire ends is fine ---- */
-- 2 days at £18 = £36, deposit at least £7.20.
SET @From = DATEADD(DAY, 8, @Today);
SET @To = DATEADD(DAY, 10, @Today);
EXEC usp_Hire_Add @BikeID = 1, @CustomerID = 1, @StartDate = @From,
    @EndDate = @To, @DepositPaid = 10.00,
     @BookedByStaffID = 2, @NewHireID = @HireID OUTPUT,
         @Message = @Message OUTPUT;
IF @Message = ''
     BEGIN PRINT 'PASS 14: hire starting as the last one ends accepted';
         SET @Pass = @Pass + 1; END
ELSE BEGIN PRINT 'FAIL 14: back-to-back hire refused: ' + @Message + '';
    SET @Fail = @Fail + 1; END

/* ---- 15. CONTROL: too small a deposit must be refused ---- */
SET @From = DATEADD(DAY, 12, @Today);
SET @To = DATEADD(DAY, 14, @Today);
EXEC usp_Hire_Add @BikeID = 1, @CustomerID = 2, @StartDate = @From,
    @EndDate = @To, @DepositPaid = 1.00,
     @BookedByStaffID = 2, @NewHireID = @HireID OUTPUT,
         @Message = @Message OUTPUT;
IF @Message LIKE '%deposit%'
     BEGIN PRINT 'PASS 15 (control): small deposit refused: ' + @Message + '';
         SET @Pass = @Pass + 1; END
ELSE BEGIN PRINT 'FAIL 15 (control): a £1 deposit got through';
    SET @Fail = @Fail + 1; END

/* ---- 16. CONTROL: a bike that is for sale cannot be hired ---- */
EXEC usp_Hire_Add @BikeID = 7, @CustomerID = 2, @StartDate = @From,
    @EndDate = @To, @DepositPaid = 50,
     @BookedByStaffID = 2, @NewHireID = @HireID OUTPUT,
         @Message = @Message OUTPUT;
IF @Message <> ''
     BEGIN PRINT 'PASS 16 (control): sale bike refused for hire: ' + @Message
         + ''; SET @Pass = @Pass + 1; END
ELSE BEGIN PRINT 'FAIL 16 (control): a sale bike was hired'; SET @Fail = @Fail
    + 1; END

/* ================= STOCK: never below zero, always right ================= */
-- Part 4 (disc pads) has 2 in stock in the sample data.

/* ---- 17. CONTROL: selling more than is in stock must be refused ---- */
EXEC usp_PartSale_Add @PartID = 4, @CustomerID = NULL, @Quantity = 3,
    @SoldByStaffID = 2,
     @NewPartSaleID = @ID OUTPUT, @Message = @Message OUTPUT;
IF @Message <> ''
     BEGIN PRINT 'PASS 17 (control): selling 3 with 2 in stock refused: '
         + @Message + ''; SET @Pass = @Pass + 1; END
ELSE BEGIN PRINT 'FAIL 17 (control): a sale of more than the stock got through';
    SET @Fail = @Fail + 1; END
IF (SELECT QtyInStock FROM Part WHERE PartID = 4) = 2
     BEGIN PRINT 'PASS 18: stock untouched by the refused sale';
         SET @Pass = @Pass + 1; END
ELSE BEGIN PRINT 'FAIL 18: stock changed by a refused sale'; SET @Fail = @Fail
    + 1; END

/* ---- 19. Selling exactly the stock takes it to 0 ---- */
DECLARE @SaleID INT;
EXEC usp_PartSale_Add @PartID = 4, @CustomerID = NULL, @Quantity = 2,
    @SoldByStaffID = 2,
     @NewPartSaleID = @SaleID OUTPUT, @Message = @Message OUTPUT;
IF @Message = '' AND (SELECT QtyInStock FROM Part WHERE PartID = 4) = 0
     BEGIN PRINT 'PASS 19: sale of 2 accepted and stock is now 0';
         SET @Pass = @Pass + 1; END
ELSE BEGIN PRINT 'FAIL 19: sale of 2 went wrong: ' + @Message + '';
    SET @Fail = @Fail + 1; END

/* ---- 20. A refund puts the stock back ---- */
EXEC usp_PartSale_Refund @PartSaleID = @SaleID, @Message = @Message OUTPUT;
IF @Message = '' AND (SELECT QtyInStock FROM Part WHERE PartID = 4) = 2
     BEGIN PRINT 'PASS 20: refund accepted and stock is back to 2';
         SET @Pass = @Pass + 1; END
ELSE BEGIN PRINT 'FAIL 20: refund went wrong: ' + @Message + '';
    SET @Fail = @Fail + 1; END

/* ---- 21. CONTROL: the same sale cannot be refunded twice ---- */
EXEC usp_PartSale_Refund @PartSaleID = @SaleID, @Message = @Message OUTPUT;
IF @Message <> ''
     BEGIN PRINT 'PASS 21 (control): second refund refused: ' + @Message + '';
         SET @Pass = @Pass + 1; END
ELSE BEGIN PRINT 'FAIL 21 (control): a second refund got through';
    SET @Fail = @Fail + 1; END

/* ---- 22. Receiving an order adds the stock and closes the order ---- */
-- Order 3 is 6 of part 6, which has 1 in stock.
EXEC usp_PartOrder_Receive @PartOrderID = 3, @QtyReceived = 6,
    @Message = @Message OUTPUT;
IF @Message = '' AND (SELECT QtyInStock FROM Part WHERE PartID = 6) = 7
    AND (SELECT Status FROM PartOrder WHERE PartOrderID = 3) = 'Received'
     BEGIN PRINT 'PASS 22: order received: stock 1 to 7, order marked Received';
         SET @Pass = @Pass + 1; END
ELSE BEGIN PRINT 'FAIL 22: receiving the order went wrong: ' + @Message + '';
    SET @Fail = @Fail + 1; END

/* ================= BIKE SALES and the rest ================= */

/* ---- 23. CONTROL: a bike already sold cannot be sold again (bike 11) ---- */
EXEC usp_Bike_Sell @BikeID = 11, @CustomerID = 1, @Message = @Message OUTPUT;
IF @Message <> ''
     BEGIN PRINT 'PASS 23 (control): sold bike refused: ' + @Message + '';
         SET @Pass = @Pass + 1; END
ELSE BEGIN PRINT 'FAIL 23 (control): a sold bike was sold again';
    SET @Fail = @Fail + 1; END

/* ---- 24. CONTROL: a reserved bike cannot go to another customer ---- */
-- Bike 10 is reserved for Méabh (9).
EXEC usp_Bike_Sell @BikeID = 10, @CustomerID = 1, @Message = @Message OUTPUT;
IF @Message <> ''
     BEGIN PRINT 'PASS 24 (control): reserved bike protected: ' + @Message + '';
         SET @Pass = @Pass + 1; END
ELSE BEGIN PRINT 'FAIL 24 (control): a reserved bike was sold to someone else';
    SET @Fail = @Fail + 1; END

/* ---- 25. The reserving customer can buy it ---- */
EXEC usp_Bike_Sell @BikeID = 10, @CustomerID = 9, @Message = @Message OUTPUT;
IF @Message = '' AND (SELECT Status FROM Bike WHERE BikeID = 10) = 'Sold'
     BEGIN PRINT 'PASS 25: reserved bike sold to the right customer';
         SET @Pass = @Pass + 1; END
ELSE BEGIN PRINT 'FAIL 25: sale to the reserving customer went wrong: '
    + @Message + ''; SET @Fail = @Fail + 1; END

/* ---- 26. CONTROL: a customer with bookings cannot be deleted ---- */
EXEC usp_Customer_Delete @CustomerID = 1, @Message = @Message OUTPUT;
IF @Message <> ''
     BEGIN PRINT 'PASS 26 (control): customer with history kept: ' + @Message
         + ''; SET @Pass = @Pass + 1; END
ELSE BEGIN PRINT 'FAIL 26 (control): a customer with bookings was deleted';
    SET @Fail = @Fail + 1; END

/* ---- 27. Login ---- */
-- The right details get in; a wrong password and an inactive member do not.
DECLARE @Login TABLE (StaffID INT, FullName VARCHAR(81), Role VARCHAR(10));
INSERT INTO @Login EXEC usp_Staff_Login @Username = 'siobhan',
    @Password = 'canal01';
INSERT INTO @Login EXEC usp_Staff_Login @Username = 'siobhan',
    @Password = 'wrong';
INSERT INTO @Login EXEC usp_Staff_Login @Username = 'liam',
    @Password = 'canal06';
IF (SELECT COUNT(*) FROM @Login) = 1
    AND EXISTS (SELECT * FROM @Login WHERE Role = 'Manager')
     BEGIN PRINT 'PASS 27: login accepts the right details only';
         SET @Pass = @Pass + 1; END
ELSE BEGIN PRINT 'FAIL 27: login let in '
    + CAST((SELECT COUNT(*) FROM @Login) AS VARCHAR)
    + ' of 3 attempts, expected 1'; SET @Fail = @Fail + 1; END

PRINT '-----------------------------------------';
PRINT 'PASSED ' + CAST(@Pass AS VARCHAR) + '   FAILED '
    + CAST(@Fail AS VARCHAR);
IF @Fail = 0 PRINT 'ALL RULES HOLD.'
    ELSE PRINT 'A RULE IS BROKEN: read the FAIL lines above.';
PRINT 'Now run BikeShop.sql again to put the sample data back.';
GO
