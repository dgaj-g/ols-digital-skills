-- BikeShop sample data: the records from the demo database.
-- Put them into your own tables to check each part of your program.

/* ---- 4. Sample data (relative to today, so the diary is never empty) ---- */

DECLARE @Today DATE, @Day0 DATETIME, @Next DATETIME;
SET @Today = CAST(GETDATE() AS DATE);
SET @Day0  = CAST(@Today AS DATETIME);                -- today at 00:00
-- tomorrow, or Monday if tomorrow is Sunday
SET @Next  = DATEADD(DAY, 1, @Day0);
IF DATENAME(WEEKDAY, @Next) = 'Sunday' SET @Next = DATEADD(DAY, 1, @Next);

INSERT INTO Customer (FirstName, LastName, Phone, Email, DateJoined) VALUES
 -- 1
 ('Aoife',    'McCann',    '028 3026 4411', 'aoife.mccann@example.com',
     DATEADD(DAY, -400, @Today)),
 -- 2
 ('Seán',     'Devlin',    '07712 334 918', 'sean.devlin@example.com',
     DATEADD(DAY, -380, @Today)),
 -- 3
 ('Ciara',    'Quinn',     '028 3025 7720', NULL,
     DATEADD(DAY, -300, @Today)),
 -- 4
 ('Oisín',    'Fegan',     '07855 201 377', 'oisin.fegan@example.com',
     DATEADD(DAY, -260, @Today)),
 -- 5
 ('Gráinne',  'Murphy',    '028 3083 1190', 'grainne.murphy@example.com',
     DATEADD(DAY, -200, @Today)),
 -- 6
 ('Tomás',    'Loughran',  '07400 556 212', 'tomas.loughran@example.com',
     DATEADD(DAY, -150, @Today)),
 -- 7
 ('Hannah',   'Boyle',     '028 3026 9034', NULL,
     DATEADD(DAY, -120, @Today)),
 -- 8
 ('Darragh',  'Rice',      '07911 782 450', 'darragh.rice@example.com',
     DATEADD(DAY,  -90, @Today)),
 -- 9
 ('Méabh',    'Cunningham','028 3083 2278', 'meabh.c@example.com',
     DATEADD(DAY,  -60, @Today)),
 -- 10
 ('Jack',     'O''Hare',   '07525 118 906', 'jack.ohare@example.com',
     DATEADD(DAY,  -40, @Today)),
 -- 11
 ('Róisín',   'Campbell',  '028 3026 1552',
     'roisin.campbell@example.com',DATEADD(DAY,  -21, @Today)),
 -- 12
 ('Ben',      'Toner',     '07388 640 271', 'ben.toner@example.com',
     DATEADD(DAY,   -5, @Today));

INSERT INTO Staff (FirstName, LastName, Role, Username, Password,
    IsActive) VALUES
 ('Siobhán', 'Rooney',  'Manager',  'siobhan', 'canal01', 1),  -- 1
 ('Pádraig', 'Maguire', 'Counter',  'padraig', 'canal02', 1),  -- 2
 ('Aoife',   'Byrne',   'Mechanic', 'aoife',   'canal03', 1),  -- 3
 ('Conor',   'Walsh',   'Mechanic', 'conor',   'canal04', 1),  -- 4
 ('Niamh',   'Hughes',  'Mechanic', 'niamh',   'canal05', 1),  -- 5
 -- 6 (left in the summer: switched off, not deleted)
 ('Liam',    'Doran',   'Mechanic', 'liam',    'canal06', 0);

INSERT INTO ServiceType (Name, DurationMinutes, Price) VALUES
 ('Puncture repair',        30,  15.00),  -- 1
 ('Safety check',           30,   0.00),  -- 2
 ('Gear tune-up',           45,  25.00),  -- 3
 ('Wheel true',             45,  20.00),  -- 4
 ('Brake pad replacement',  45,  28.00),  -- 5
 ('Basic service',          60,  40.00),  -- 6
 ('Full service',          120,  85.00);  -- 7

INSERT INTO Supplier (Name, Phone, Email) VALUES
 -- 1
 ('Mourne Cycle Supplies',  '028 4176 2200', 'orders@mournecycle.example'),
 -- 2
 ('Lagan Bike Parts',       '028 9032 8811', 'sales@laganbikeparts.example'),
 -- 3
 ('Northern Components Ltd','028 7126 5050', NULL);

INSERT INTO Part (PartCode, Name, SupplierID, UnitCost, SellPrice, QtyInStock,
    ReorderLevel, ReorderQty) VALUES
 -- 1
 ('TUBE-700',    'Inner tube 700c',              1, 2.40,  6.00, 18, 10, 20),
 -- 2
 ('TUBE-26',     'Inner tube 26"',               1, 2.20,  5.50, 12,  8, 20),
 -- 3
 ('PADS-RIM',    'Brake pads, rim (pair)',       2, 3.10,  9.00,  9,  4, 10),
 -- 4  at/below reorder level, no order
 ('PADS-DISC',   'Brake pads, disc (pair)',      2, 6.50, 16.00,  2,  4, 10),
 -- 5
 ('CHAIN-9',     'Chain, 9-speed',               3, 8.90, 19.00,  5,  2,  6),
 -- 6  below level, order already placed
 ('CHAIN-11',    'Chain, 11-speed',              3,14.20, 29.00,  1,  2,  6),
 -- 7
 ('CABLE-BRK',   'Brake cable',                  2, 1.10,  4.00, 25,  8, 25),
 -- 8
 ('CABLE-GR',    'Gear cable',                   2, 1.05,  4.00, 22,  8, 25),
 -- 9  at level, no order
 ('TYRE-700-35', 'Tyre 700 x 35c',               1, 9.80, 24.00,  3,  3,  8),
 -- 10
 ('CAGE-ALU',    'Bottle cage, alloy',           3, 2.30,  7.00, 14,  5, 12),
 -- 11
 ('TAPE-BAR',    'Handlebar tape',               3, 3.60, 11.00,  7,  3, 10),
 -- 12
 ('LIGHT-SET',   'Light set, USB front and rear',1,11.40, 28.00,  6,  3,  8);

INSERT INTO Bike (FrameNumber, Make, Model, Size, Colour, Purpose, DailyRate,
    SalePrice, Status, CustomerID, SoldOn) VALUES
 -- 1
 ('TK-2201', 'Trek',        'FX 2',        'M',  'Blue',  'Hire', 18.00, NULL,
     'Available', NULL, NULL),
 -- 2
 ('TK-2202', 'Trek',        'FX 2',        'L',  'Blue',  'Hire', 18.00, NULL,
     'Available', NULL, NULL),
 -- 3
 ('GT-5110', 'Giant',       'Escape 3',    'S',  'Grey',  'Hire', 16.00, NULL,
     'Available', NULL, NULL),
 -- 4
 ('GT-5111', 'Giant',       'Escape 3',    'M',  'Grey',  'Hire', 16.00, NULL,
     'Available', NULL, NULL),
 -- 5
 ('SP-7730', 'Specialized', 'Sirrus 2.0',  'L',  'Black', 'Hire', 22.00, NULL,
     'Available', NULL, NULL),
 -- 6
 ('FR-0621', 'Frog',        '62',          'XS', 'Green', 'Hire', 12.00, NULL,
     'In repair', NULL, NULL),
 -- 7
 ('CB-8891', 'Cube',        'Nature Pro',  'M',  'Grey',  'Sale', NULL,  749.00,
     'Available', NULL, NULL),
 -- 8
 ('TK-9033', 'Trek',        'Marlin 7',    'L',  'Red',   'Sale', NULL,  849.00,
     'Available', NULL, NULL),
 -- 9
 ('GT-6604', 'Giant',       'Contend 2',   'M',  'Black', 'Sale', NULL,  699.00,
     'Available', NULL, NULL),
 -- 10 reserved for Méabh
 ('RL-3310', 'Raleigh',     'Strada 2',    'S',  'Blue',  'Sale', NULL,  399.00,
     'Reserved',  9,    NULL),
 -- 11 sold to Oisín
 ('CA-1180', 'Carrera',     'Subway 1',    'M',  'Black', 'Sale', NULL,  299.00,
     'Sold',      4,    DATEADD(DAY, -10, @Today)),
 -- 12
 ('CN-4421', 'Cannondale',  'Quick 4',     'L',  'Teal',  'Sale', NULL,  575.00,
     'Available', NULL, NULL);

-- Appointments: minutes past midnight (540 = 09:00, 600 = 10:00, 720 = 12:00,
-- 840 = 14:00)
INSERT INTO Appointment (CustomerID, MechanicID, ServiceTypeID, StartTime,
    EndTime, BikeDescription, Notes, Status, BookedByStaffID, BookedOn) VALUES
 -- last week, all done
 (1, 3, 6, DATEADD(MINUTE, 540, DATEADD(DAY, -7, @Day0)),
     DATEADD(MINUTE, 600, DATEADD(DAY, -7, @Day0)), 'Blue Trek hybrid',
     NULL,                       'Done',      2, DATEADD(DAY, -12, @Day0)),
 (2, 4, 7, DATEADD(MINUTE, 600, DATEADD(DAY, -7, @Day0)),
     DATEADD(MINUTE, 720, DATEADD(DAY, -7, @Day0)), 'Black Giant road bike',
     'Creaking bottom bracket', 'Done',      2, DATEADD(DAY, -11, @Day0)),
 (5, 5, 3, DATEADD(MINUTE, 810, DATEADD(DAY, -6, @Day0)),
     DATEADD(MINUTE, 855, DATEADD(DAY, -6, @Day0)), 'Red Specialized',
     NULL,                       'Done',      1, DATEADD(DAY, -10, @Day0)),
 (8, 3, 1, DATEADD(MINUTE, 870, DATEADD(DAY, -5, @Day0)),
     DATEADD(MINUTE, 900, DATEADD(DAY, -5, @Day0)), 'Kids'' Frog, green',
     NULL,                       'Done',      2, DATEADD(DAY,  -5, @Day0)),
 (3, 4, 5, DATEADD(MINUTE, 540, DATEADD(DAY, -4, @Day0)),
     DATEADD(MINUTE, 585, DATEADD(DAY, -4, @Day0)), 'Silver Carrera',
     'Rear pads only',          'Done',      2, DATEADD(DAY,  -8, @Day0)),
 (6, 5, 6, DATEADD(MINUTE, 660, DATEADD(DAY, -3, @Day0)),
     DATEADD(MINUTE, 720, DATEADD(DAY, -3, @Day0)), 'Grey Cube e-bike',
     NULL,                       'Done',      1, DATEADD(DAY,  -9, @Day0)),
 -- yesterday: one cancelled (history kept)
 (10,3, 4, DATEADD(MINUTE, 600, DATEADD(DAY, -1, @Day0)),
     DATEADD(MINUTE, 645, DATEADD(DAY, -1, @Day0)), 'Orange Boardman',
     'Customer rang to cancel', 'Cancelled', 2, DATEADD(DAY,  -6, @Day0)),
 -- today
 (7, 3, 6, DATEADD(MINUTE, 540, @Day0), DATEADD(MINUTE, 600, @Day0),
     'White Raleigh step-through', NULL,                  'Booked',    2,
     DATEADD(DAY,  -3, @Day0)),
 (9, 3, 7, DATEADD(MINUTE, 600, @Day0), DATEADD(MINUTE, 720, @Day0),
     'Teal Cannondale',          'Touching the 09:00 job: allowed', 'Booked', 2,
     DATEADD(DAY, -3, @Day0)),
 (4, 4, 1, DATEADD(MINUTE, 570, @Day0), DATEADD(MINUTE, 600, @Day0),
     'Black Carrera Subway',     NULL,                  'Booked',    1,
     DATEADD(DAY,  -1, @Day0)),
 (11,5, 3, DATEADD(MINUTE, 840, @Day0), DATEADD(MINUTE, 885, @Day0),
     'Purple Liv',               NULL,                  'Booked',    2,
     DATEADD(DAY,  -2, @Day0)),
 (12,4, 5, DATEADD(MINUTE, 900, @Day0), DATEADD(MINUTE, 945, @Day0),
     'Red Trek Marlin',          'Front disc pads',    'Booked',    2,
     DATEADD(DAY,  -1, @Day0)),
 -- the next working day
 (2, 5, 7, DATEADD(MINUTE, 540, @Next), DATEADD(MINUTE, 660, @Next),
     'Black Giant road bike', 'Follow-up', 'Booked', 2,
     DATEADD(DAY, -1, @Day0)),
 (1, 4, 4, DATEADD(MINUTE, 630, @Next), DATEADD(MINUTE, 675, @Next),
     'Blue Trek hybrid',      NULL,         'Booked', 1, @Day0);

INSERT INTO Hire (BikeID, CustomerID, StartDate, EndDate, TotalCost,
    DepositPaid, Status, BookedByStaffID, BookedOn) VALUES
 (1, 2, DATEADD(DAY, -20, @Today), DATEADD(DAY, -18, @Today),  36.00, 10.00,
     'Returned',  2, DATEADD(DAY, -25, @Day0)),
 (5, 5, DATEADD(DAY, -14, @Today), DATEADD(DAY,  -9, @Today), 110.00, 30.00,
     'Returned',  2, DATEADD(DAY, -16, @Day0)),
 (3, 8, DATEADD(DAY,  -2, @Today), DATEADD(DAY,   2, @Today),  64.00, 20.00,
     'Out',       2, DATEADD(DAY,  -4, @Day0)),
 (1, 10,DATEADD(DAY,   3, @Today), DATEADD(DAY,   6, @Today),  54.00, 11.00,
     'Booked',    1, DATEADD(DAY,  -1, @Day0)),
 -- starts the day the previous hire ends: allowed
 (1, 11,DATEADD(DAY,   6, @Today), DATEADD(DAY,   8, @Today),  36.00, 10.00,
     'Booked',    2, @Day0),
 (4, 6, DATEADD(DAY,   1, @Today), DATEADD(DAY,   3, @Today),  32.00,  7.00,
     'Cancelled', 2, DATEADD(DAY,  -3, @Day0));

INSERT INTO PartOrder (PartID, QtyOrdered, OrderedOn, ExpectedOn, ReceivedOn,
    QtyReceived, Status, PlacedByStaffID) VALUES
 (1,  20, DATEADD(DAY, -30, @Today), DATEADD(DAY, -25, @Today),
     DATEADD(DAY, -24, @Today), 20,  'Received',  1),
 (3,  10, DATEADD(DAY, -18, @Today), DATEADD(DAY, -14, @Today),
     DATEADD(DAY, -14, @Today), 10,  'Received',  1),
 (6,   6, DATEADD(DAY,  -2, @Today), DATEADD(DAY,   3, @Today), NULL,
     NULL,'Ordered',   1),
 (10, 12, DATEADD(DAY, -40, @Today), DATEADD(DAY, -35, @Today), NULL,
     NULL,'Cancelled', 1);

INSERT INTO PartSale (PartID, CustomerID, Quantity, UnitPrice, SoldOn,
    SoldByStaffID, Status) VALUES
 (1,  NULL, 2,  6.00, DATEADD(MINUTE, 615, DATEADD(DAY, -9, @Day0)), 2, 'Sold'),
 (3,  3,    1,  9.00, DATEADD(MINUTE, 700, DATEADD(DAY, -8, @Day0)), 2, 'Sold'),
 (12, 8,    1, 28.00, DATEADD(MINUTE, 960, DATEADD(DAY, -6, @Day0)), 2, 'Sold'),
 (7,  NULL, 3,  4.00, DATEADD(MINUTE, 570, DATEADD(DAY, -4, @Day0)), 1, 'Sold'),
 -- brought back: stock went back up
 (11, 11,   1, 11.00, DATEADD(MINUTE, 880, DATEADD(DAY, -3, @Day0)), 2,
     'Refunded'),
 (2,  NULL, 1,  5.50, DATEADD(MINUTE, 600, DATEADD(DAY, -2, @Day0)), 2, 'Sold'),
 (4,  12,   2, 16.00, DATEADD(MINUTE, 930, DATEADD(DAY, -1, @Day0)), 2, 'Sold'),
 (1,  2,    1,  6.00, DATEADD(MINUTE, 540, @Day0),                   2, 'Sold');
GO