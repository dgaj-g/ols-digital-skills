/* =====================================================================
   BikeShop.sql  —  Towpath Cycles (workshop + bike hire), Newry
   A2 SSD coursework demo database.  SQL Server 2019 / LocalDB.

   This script is RERUNNABLE: run it from the top any time and you get
   a fresh database with the same sample data.  Keep it in your
   OneDrive folder — it is the master copy of your database.

   Order:  1 create the database   2 drop old tables (children first)
           3 create tables         4 sample data        5 procedures
   ===================================================================== */

IF DB_ID('BikeShop') IS NULL
    CREATE DATABASE BikeShop;
GO
USE BikeShop;
GO

/* ---- 2. Drop old tables, children first ---- */
-- A child table holds the foreign key, so it goes before its parent.
DROP TABLE IF EXISTS PartSale;
DROP TABLE IF EXISTS PartOrder;
DROP TABLE IF EXISTS Part;
DROP TABLE IF EXISTS Supplier;
DROP TABLE IF EXISTS Hire;
DROP TABLE IF EXISTS Appointment;
DROP TABLE IF EXISTS Bike;
DROP TABLE IF EXISTS ServiceType;
DROP TABLE IF EXISTS Staff;
DROP TABLE IF EXISTS Customer;
GO

/* ---- 3. Tables ---- */

CREATE TABLE Customer (
    CustomerID   INT IDENTITY(1,1) NOT NULL,
    FirstName    VARCHAR(40)  NOT NULL,
    LastName     VARCHAR(40)  NOT NULL,
    Phone        VARCHAR(15)   NOT NULL,
    Email        VARCHAR(100) NULL,
    DateJoined   DATE          NOT NULL
        CONSTRAINT DF_Customer_DateJoined DEFAULT (CAST(GETDATE() AS DATE)),
    CONSTRAINT PK_Customer PRIMARY KEY (CustomerID),
    CONSTRAINT CK_Customer_Phone CHECK (LEN(Phone) >= 10)
);
GO

CREATE TABLE Staff (
    StaffID      INT IDENTITY(1,1) NOT NULL,
    FirstName    VARCHAR(40) NOT NULL,
    LastName     VARCHAR(40) NOT NULL,
    Role         VARCHAR(10)  NOT NULL,
    Username     VARCHAR(30)  NOT NULL,
    -- a real system stores a hash; say so in your user guide
    Password     VARCHAR(30)  NOT NULL,
    IsActive     BIT          NOT NULL CONSTRAINT DF_Staff_IsActive DEFAULT (1),
    CONSTRAINT PK_Staff PRIMARY KEY (StaffID),
    CONSTRAINT UQ_Staff_Username UNIQUE (Username),
    CONSTRAINT CK_Staff_Role CHECK (Role IN ('Mechanic', 'Counter', 'Manager'))
);
GO

CREATE TABLE ServiceType (
    ServiceTypeID   INT IDENTITY(1,1) NOT NULL,
    Name            VARCHAR(40) NOT NULL,
    DurationMinutes INT          NOT NULL,
    Price           DECIMAL(8,2) NOT NULL,
    CONSTRAINT PK_ServiceType PRIMARY KEY (ServiceTypeID),
    CONSTRAINT UQ_ServiceType_Name UNIQUE (Name),
    CONSTRAINT CK_ServiceType_Duration CHECK (DurationMinutes BETWEEN 15
        AND 480 AND DurationMinutes % 15 = 0),
    CONSTRAINT CK_ServiceType_Price CHECK (Price >= 0)
);
GO

CREATE TABLE Appointment (
    AppointmentID   INT IDENTITY(1,1) NOT NULL,
    CustomerID      INT           NOT NULL,
    MechanicID      INT           NOT NULL,
    ServiceTypeID   INT           NOT NULL,
    StartTime       DATETIME      NOT NULL,
    EndTime         DATETIME      NOT NULL,
    BikeDescription VARCHAR(80)  NOT NULL,
    Notes           VARCHAR(200) NULL,
    Status          VARCHAR(10)   NOT NULL
        CONSTRAINT DF_Appointment_Status DEFAULT ('Booked'),
    BookedByStaffID INT           NOT NULL,
    BookedOn        DATETIME      NOT NULL
        CONSTRAINT DF_Appointment_BookedOn DEFAULT (GETDATE()),
    CONSTRAINT PK_Appointment PRIMARY KEY (AppointmentID),
    CONSTRAINT FK_Appointment_Customer    FOREIGN KEY (CustomerID)
        REFERENCES Customer (CustomerID),
    CONSTRAINT FK_Appointment_Mechanic    FOREIGN KEY (MechanicID)
        REFERENCES Staff (StaffID),
    CONSTRAINT FK_Appointment_ServiceType FOREIGN KEY (ServiceTypeID)
        REFERENCES ServiceType (ServiceTypeID),
    CONSTRAINT FK_Appointment_BookedBy    FOREIGN KEY (BookedByStaffID)
        REFERENCES Staff (StaffID),
    CONSTRAINT CK_Appointment_Times  CHECK (EndTime > StartTime),
    CONSTRAINT CK_Appointment_Status CHECK (Status IN ('Booked', 'Done',
        'Cancelled'))
);
GO

CREATE TABLE Bike (
    BikeID      INT IDENTITY(1,1) NOT NULL,
    FrameNumber VARCHAR(20)  NOT NULL,
    Make        VARCHAR(30) NOT NULL,
    Model       VARCHAR(40) NOT NULL,
    Size        VARCHAR(2)   NOT NULL,
    Colour      VARCHAR(20) NOT NULL,
    Purpose     VARCHAR(4)   NOT NULL,
    DailyRate   DECIMAL(6,2) NULL,
    SalePrice   DECIMAL(8,2) NULL,
    Status      VARCHAR(10)  NOT NULL
        CONSTRAINT DF_Bike_Status DEFAULT ('Available'),
    CustomerID  INT          NULL,      -- reserved for / sold to
    SoldOn      DATE         NULL,
    CONSTRAINT PK_Bike PRIMARY KEY (BikeID),
    CONSTRAINT UQ_Bike_FrameNumber UNIQUE (FrameNumber),
    CONSTRAINT FK_Bike_Customer FOREIGN KEY (CustomerID)
        REFERENCES Customer (CustomerID),
    CONSTRAINT CK_Bike_Size    CHECK (Size IN ('XS', 'S', 'M', 'L', 'XL')),
    CONSTRAINT CK_Bike_Purpose CHECK (Purpose IN ('Hire', 'Sale')),
    CONSTRAINT CK_Bike_Status  CHECK (Status IN ('Available', 'Reserved',
        'Sold', 'In repair')),
    CONSTRAINT CK_Bike_DailyRate CHECK (DailyRate IS NULL OR DailyRate >= 0),
    CONSTRAINT CK_Bike_SalePrice CHECK (SalePrice IS NULL OR SalePrice >= 0),
    CONSTRAINT CK_Bike_PriceForPurpose CHECK (
        (Purpose = 'Hire' AND DailyRate IS NOT NULL)
            OR (Purpose = 'Sale' AND SalePrice IS NOT NULL)),
    CONSTRAINT CK_Bike_SoldNeedsDetails CHECK (
        (Status = 'Sold' AND SoldOn IS NOT NULL AND CustomerID IS NOT NULL)
            OR (Status <> 'Sold' AND SoldOn IS NULL))
);
GO

CREATE TABLE Hire (
    HireID          INT IDENTITY(1,1) NOT NULL,
    BikeID          INT          NOT NULL,
    CustomerID      INT          NOT NULL,
    StartDate       DATE         NOT NULL,
    EndDate         DATE         NOT NULL,   -- the day the bike comes back
    TotalCost       DECIMAL(8,2) NOT NULL,
    DepositPaid     DECIMAL(8,2) NOT NULL
        CONSTRAINT DF_Hire_DepositPaid DEFAULT (0),
    Status          VARCHAR(10)  NOT NULL
        CONSTRAINT DF_Hire_Status DEFAULT ('Booked'),
    BookedByStaffID INT          NOT NULL,
    BookedOn        DATETIME     NOT NULL
        CONSTRAINT DF_Hire_BookedOn DEFAULT (GETDATE()),
    CONSTRAINT PK_Hire PRIMARY KEY (HireID),
    CONSTRAINT FK_Hire_Bike     FOREIGN KEY (BikeID)
        REFERENCES Bike (BikeID),
    CONSTRAINT FK_Hire_Customer FOREIGN KEY (CustomerID)
        REFERENCES Customer (CustomerID),
    CONSTRAINT FK_Hire_BookedBy FOREIGN KEY (BookedByStaffID)
        REFERENCES Staff (StaffID),
    CONSTRAINT CK_Hire_Dates   CHECK (EndDate > StartDate),
    CONSTRAINT CK_Hire_Total   CHECK (TotalCost >= 0),
    CONSTRAINT CK_Hire_Deposit CHECK (DepositPaid >= 0),
    CONSTRAINT CK_Hire_Status  CHECK (Status IN ('Booked', 'Out', 'Returned',
        'Cancelled'))
);
GO

CREATE TABLE Supplier (
    SupplierID INT IDENTITY(1,1) NOT NULL,
    Name       VARCHAR(60)  NOT NULL,
    Phone      VARCHAR(15)   NOT NULL,
    Email      VARCHAR(100) NULL,
    CONSTRAINT PK_Supplier PRIMARY KEY (SupplierID),
    CONSTRAINT UQ_Supplier_Name UNIQUE (Name)
);
GO

CREATE TABLE Part (
    PartID       INT IDENTITY(1,1) NOT NULL,
    PartCode     VARCHAR(12)  NOT NULL,
    Name         VARCHAR(60) NOT NULL,
    SupplierID   INT          NOT NULL,
    UnitCost     DECIMAL(7,2) NOT NULL,   -- what we pay
    SellPrice    DECIMAL(7,2) NOT NULL,   -- what the customer pays
    QtyInStock   INT          NOT NULL
        CONSTRAINT DF_Part_QtyInStock DEFAULT (0),
    ReorderLevel INT          NOT NULL,
    ReorderQty   INT          NOT NULL,
    CONSTRAINT PK_Part PRIMARY KEY (PartID),
    CONSTRAINT UQ_Part_PartCode UNIQUE (PartCode),
    CONSTRAINT FK_Part_Supplier FOREIGN KEY (SupplierID)
        REFERENCES Supplier (SupplierID),
    CONSTRAINT CK_Part_UnitCost     CHECK (UnitCost >= 0),
    CONSTRAINT CK_Part_SellPrice    CHECK (SellPrice >= 0),
    -- stock can never go below zero
    CONSTRAINT CK_Part_QtyInStock   CHECK (QtyInStock >= 0),
    CONSTRAINT CK_Part_ReorderLevel CHECK (ReorderLevel >= 0),
    CONSTRAINT CK_Part_ReorderQty   CHECK (ReorderQty > 0)
);
GO

CREATE TABLE PartOrder (
    PartOrderID     INT IDENTITY(1,1) NOT NULL,
    PartID          INT         NOT NULL,
    QtyOrdered      INT         NOT NULL,
    OrderedOn       DATE        NOT NULL
        CONSTRAINT DF_PartOrder_OrderedOn DEFAULT (CAST(GETDATE() AS DATE)),
    ExpectedOn      DATE        NULL,
    ReceivedOn      DATE        NULL,
    QtyReceived     INT         NULL,
    Status          VARCHAR(10) NOT NULL
        CONSTRAINT DF_PartOrder_Status DEFAULT ('Ordered'),
    PlacedByStaffID INT         NOT NULL,
    CONSTRAINT PK_PartOrder PRIMARY KEY (PartOrderID),
    CONSTRAINT FK_PartOrder_Part     FOREIGN KEY (PartID)
        REFERENCES Part (PartID),
    CONSTRAINT FK_PartOrder_PlacedBy FOREIGN KEY (PlacedByStaffID)
        REFERENCES Staff (StaffID),
    CONSTRAINT CK_PartOrder_Qty         CHECK (QtyOrdered > 0),
    CONSTRAINT CK_PartOrder_QtyReceived CHECK (QtyReceived IS NULL
        OR QtyReceived >= 0),
    CONSTRAINT CK_PartOrder_Status      CHECK (Status IN ('Ordered', 'Received',
        'Cancelled'))
);
GO

CREATE TABLE PartSale (
    PartSaleID    INT IDENTITY(1,1) NOT NULL,
    PartID        INT          NOT NULL,
    CustomerID    INT          NULL,      -- NULL = walk-in customer
    Quantity      INT          NOT NULL,
    -- the price on the day: history keeps it
    UnitPrice     DECIMAL(7,2) NOT NULL,
    SoldOn        DATETIME     NOT NULL
        CONSTRAINT DF_PartSale_SoldOn DEFAULT (GETDATE()),
    SoldByStaffID INT          NOT NULL,
    Status        VARCHAR(10)  NOT NULL
        CONSTRAINT DF_PartSale_Status DEFAULT ('Sold'),
    CONSTRAINT PK_PartSale PRIMARY KEY (PartSaleID),
    CONSTRAINT FK_PartSale_Part     FOREIGN KEY (PartID)
        REFERENCES Part (PartID),
    CONSTRAINT FK_PartSale_Customer FOREIGN KEY (CustomerID)
        REFERENCES Customer (CustomerID),
    CONSTRAINT FK_PartSale_SoldBy   FOREIGN KEY (SoldByStaffID)
        REFERENCES Staff (StaffID),
    CONSTRAINT CK_PartSale_Quantity CHECK (Quantity > 0),
    CONSTRAINT CK_PartSale_Status   CHECK (Status IN ('Sold', 'Refunded'))
);
GO

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

/* =====================================================================
   5. Stored procedures.  Naming: usp_Table_Action, so SSMS groups them.
   Every procedure that changes data has @Message VARCHAR(200) OUTPUT as its
   last parameter.  A rule the user has broken sets @Message to a plain
   sentence and stops with RETURN.  A blank @Message means it worked.  The C#
   shows the message exactly as it is.
   ===================================================================== */

/* ---- Customer ---- */

CREATE OR ALTER PROCEDURE usp_Customer_Search
    @SearchText VARCHAR(50)
AS
BEGIN
    SELECT CustomerID,
           FirstName + ' ' + LastName AS FullName,
           Phone, Email, DateJoined
    FROM Customer
    WHERE FirstName LIKE '%' + @SearchText + '%'
       OR LastName  LIKE '%' + @SearchText + '%'
       OR Phone     LIKE '%' + @SearchText + '%'
    ORDER BY LastName, FirstName;
END
GO

CREATE OR ALTER PROCEDURE usp_Customer_GetByID
    @CustomerID INT
AS
BEGIN
    SELECT CustomerID, FirstName, LastName, Phone, Email, DateJoined
    FROM Customer
    WHERE CustomerID = @CustomerID;
END
GO

CREATE OR ALTER PROCEDURE usp_Customer_Add
    @FirstName     VARCHAR(40),
    @LastName      VARCHAR(40),
    @Phone         VARCHAR(15),
    @Email         VARCHAR(100),
    @NewCustomerID INT OUTPUT,
    @Message VARCHAR(200) OUTPUT
AS
BEGIN
    SET @Message = '';
    INSERT INTO Customer (FirstName, LastName, Phone, Email)
    VALUES (@FirstName, @LastName, @Phone, @Email);
    SET @NewCustomerID = SCOPE_IDENTITY();
END
GO

CREATE OR ALTER PROCEDURE usp_Customer_Update
    @CustomerID INT,
    @FirstName  VARCHAR(40),
    @LastName   VARCHAR(40),
    @Phone      VARCHAR(15),
    @Email      VARCHAR(100),
    @Message VARCHAR(200) OUTPUT
AS
BEGIN
    SET @Message = '';
    UPDATE Customer
    SET FirstName = @FirstName, LastName = @LastName, Phone = @Phone,
        Email = @Email
    WHERE CustomerID = @CustomerID;
END
GO

CREATE OR ALTER PROCEDURE usp_Customer_Delete
    @CustomerID INT,
    @Message VARCHAR(200) OUTPUT
AS
BEGIN
    SET @Message = '';
    IF EXISTS (SELECT * FROM Appointment WHERE CustomerID = @CustomerID)
       OR EXISTS (SELECT * FROM Hire     WHERE CustomerID = @CustomerID)
       OR EXISTS (SELECT * FROM PartSale WHERE CustomerID = @CustomerID)
       OR EXISTS (SELECT * FROM Bike     WHERE CustomerID = @CustomerID)
    BEGIN
        SET @Message =
            'This customer has bookings or sales on record, so they cannot ' +
            'be deleted.';
        RETURN;
    END

    DELETE FROM Customer WHERE CustomerID = @CustomerID;
END
GO

/* ---- Staff ---- */

CREATE OR ALTER PROCEDURE usp_Staff_Login
    @Username VARCHAR(30),
    @Password VARCHAR(30)
AS
BEGIN
    SELECT StaffID, FirstName + ' ' + LastName AS FullName, Role
    FROM Staff
    WHERE Username = @Username AND Password = @Password AND IsActive = 1;
END
GO

CREATE OR ALTER PROCEDURE usp_Staff_GetMechanics
AS
BEGIN
    SELECT StaffID, FirstName + ' ' + LastName AS FullName
    FROM Staff
    WHERE Role = 'Mechanic' AND IsActive = 1
    ORDER BY FirstName, LastName;
END
GO

CREATE OR ALTER PROCEDURE usp_Staff_GetAll
AS
BEGIN
    SELECT StaffID, FirstName + ' ' + LastName AS FullName, Role, Username,
        IsActive
    FROM Staff
    ORDER BY LastName, FirstName;
END
GO

CREATE OR ALTER PROCEDURE usp_Staff_Add
    @FirstName  VARCHAR(40),
    @LastName   VARCHAR(40),
    @Role       VARCHAR(10),
    @Username   VARCHAR(30),
    @Password   VARCHAR(30),
    @NewStaffID INT OUTPUT,
    @Message VARCHAR(200) OUTPUT
AS
BEGIN
    SET @Message = '';
    IF EXISTS (SELECT * FROM Staff WHERE Username = @Username)
    BEGIN
        SET @Message = 'That username is already taken.';
        RETURN;
    END

    INSERT INTO Staff (FirstName, LastName, Role, Username, Password)
    VALUES (@FirstName, @LastName, @Role, @Username, @Password);
    SET @NewStaffID = SCOPE_IDENTITY();
END
GO

/* ---- ServiceType ---- */

CREATE OR ALTER PROCEDURE usp_ServiceType_GetAll
AS
BEGIN
    SELECT ServiceTypeID, Name, DurationMinutes, Price,
           Name + ' (' + CAST(DurationMinutes AS VARCHAR(5)) + ' min, £'
               + CAST(Price AS VARCHAR) + ')' AS Display
    FROM ServiceType
    ORDER BY DurationMinutes, Name;
END
GO

CREATE OR ALTER PROCEDURE usp_ServiceType_Add
    @Name             VARCHAR(40),
    @DurationMinutes  INT,
    @Price            DECIMAL(8,2),
    @NewServiceTypeID INT OUTPUT,
    @Message VARCHAR(200) OUTPUT
AS
BEGIN
    SET @Message = '';
    INSERT INTO ServiceType (Name, DurationMinutes, Price)
    VALUES (@Name, @DurationMinutes, @Price);
    SET @NewServiceTypeID = SCOPE_IDENTITY();
END
GO

CREATE OR ALTER PROCEDURE usp_ServiceType_Update
    @ServiceTypeID   INT,
    @Name            VARCHAR(40),
    @DurationMinutes INT,
    @Price           DECIMAL(8,2),
    @Message VARCHAR(200) OUTPUT
AS
BEGIN
    SET @Message = '';
    UPDATE ServiceType
    SET Name = @Name, DurationMinutes = @DurationMinutes, Price = @Price
    WHERE ServiceTypeID = @ServiceTypeID;
END
GO

/* ---- Appointment (booking shape 1: a time slot with a mechanic) ---- */

CREATE OR ALTER PROCEDURE usp_Appointment_Add
    @CustomerID       INT,
    @MechanicID       INT,
    @ServiceTypeID    INT,
    @StartTime        DATETIME,
    @BikeDescription  VARCHAR(80),
    @Notes            VARCHAR(200),
    @BookedByStaffID  INT,
    @NewAppointmentID INT OUTPUT,
    @Message VARCHAR(200) OUTPUT
AS
BEGIN
    SET @Message = '';

    -- 1. Work out when the job ends: the service type knows how long it takes.
    DECLARE @EndTime DATETIME;
    SELECT @EndTime = DATEADD(MINUTE, DurationMinutes, @StartTime)
    FROM ServiceType
    WHERE ServiceTypeID = @ServiceTypeID;

    -- 2. The simple checks.
    IF @EndTime IS NULL
    BEGIN
        SET @Message = 'Choose a service.';
        RETURN;
    END
    IF NOT EXISTS (SELECT * FROM Staff WHERE StaffID = @MechanicID
        AND Role = 'Mechanic' AND IsActive = 1)
    BEGIN
        SET @Message = 'Choose a mechanic.';
        RETURN;
    END
    IF @StartTime < GETDATE()
    BEGIN
        SET @Message = 'That time has already passed.';
        RETURN;
    END
    IF DATENAME(WEEKDAY, @StartTime) = 'Sunday'
    BEGIN
        SET @Message = 'The workshop is closed on Sundays.';
        RETURN;
    END
    IF CAST(@StartTime AS TIME) < '08:30' OR CAST(@EndTime AS TIME) > '17:30'
    BEGIN
        SET @Message = 'The workshop is open 08:30 to 17:30.';
        RETURN;
    END

    -- 3. The clash check: does this mechanic already have a booking that
    -- overlaps?

    IF EXISTS (SELECT *
               FROM Appointment
               WHERE MechanicID = @MechanicID
                 -- a cancelled booking does not block the slot
                 AND Status <> 'Cancelled'
                 -- the new one starts before the old one ends
                 AND @StartTime < EndTime
                 -- and ends after the old one starts
                 AND @EndTime   > StartTime)
    BEGIN
        SET @Message = 'That mechanic already has a booking in that time.';
        RETURN;
    END

    INSERT INTO Appointment
        (CustomerID, MechanicID, ServiceTypeID, StartTime, EndTime,
         BikeDescription, Notes, BookedByStaffID)
    VALUES
        (@CustomerID, @MechanicID, @ServiceTypeID, @StartTime, @EndTime,
         @BikeDescription, @Notes, @BookedByStaffID);

    SET @NewAppointmentID = SCOPE_IDENTITY();
END
GO

CREATE OR ALTER PROCEDURE usp_Appointment_Move
    @AppointmentID INT,
    @NewStartTime  DATETIME,
    @Message VARCHAR(200) OUTPUT
AS
BEGIN
    SET @Message = '';

    DECLARE @MechanicID INT, @Minutes INT, @Status VARCHAR(10);
    SELECT @MechanicID = MechanicID,
       @Minutes    = DATEDIFF(MINUTE, StartTime, EndTime),
       @Status     = Status
    FROM Appointment
    WHERE AppointmentID = @AppointmentID;

    IF @MechanicID IS NULL
    BEGIN
        SET @Message = 'That booking does not exist.';
        RETURN;
    END
    IF @Status <> 'Booked'
    BEGIN
        SET @Message = 'Only a booking that is still open can be moved.';
        RETURN;
    END

    DECLARE @NewEndTime DATETIME;
    SET @NewEndTime = DATEADD(MINUTE, @Minutes, @NewStartTime);

    IF @NewStartTime < GETDATE()
    BEGIN
        SET @Message = 'That time has already passed.';
        RETURN;
    END
    IF DATENAME(WEEKDAY, @NewStartTime) = 'Sunday'
    BEGIN
        SET @Message = 'The workshop is closed on Sundays.';
        RETURN;
    END
    IF CAST(@NewStartTime AS TIME) < '08:30'
        OR CAST(@NewEndTime AS TIME) > '17:30'
    BEGIN
        SET @Message = 'The workshop is open 08:30 to 17:30.';
        RETURN;
    END

    IF EXISTS (SELECT *
               FROM Appointment
               WHERE MechanicID = @MechanicID
                 -- a booking cannot clash with itself
                 AND AppointmentID <> @AppointmentID
                 AND Status <> 'Cancelled'
                 AND @NewStartTime < EndTime
                 AND @NewEndTime   > StartTime)
    BEGIN
        SET @Message = 'That mechanic already has a booking in that time.';
        RETURN;
    END

    UPDATE Appointment
    SET StartTime = @NewStartTime, EndTime = @NewEndTime
    WHERE AppointmentID = @AppointmentID;
END
GO

CREATE OR ALTER PROCEDURE usp_Appointment_GetFreeMechanics
    @StartTime     DATETIME,
    @ServiceTypeID INT
AS
BEGIN
    DECLARE @EndTime DATETIME;
    SELECT @EndTime = DATEADD(MINUTE, DurationMinutes, @StartTime)
    FROM ServiceType
    WHERE ServiceTypeID = @ServiceTypeID;

    SELECT s.StaffID, s.FirstName + ' ' + s.LastName AS FullName
    FROM Staff s
    WHERE s.Role = 'Mechanic' AND s.IsActive = 1
      AND NOT EXISTS (SELECT *
                      FROM Appointment a
                      WHERE a.MechanicID = s.StaffID
                        AND a.Status <> 'Cancelled'
                        AND @StartTime < a.EndTime
                        AND @EndTime   > a.StartTime)
    ORDER BY s.FirstName, s.LastName;
END
GO

CREATE OR ALTER PROCEDURE usp_Appointment_GetByDay
    @Day DATE
AS
BEGIN
    SELECT a.AppointmentID,
           a.StartTime,
           a.EndTime,
           a.MechanicID,
           m.FirstName + ' ' + m.LastName AS Mechanic,
           c.FirstName + ' ' + c.LastName AS Customer,
           st.Name                        AS Service,
           a.BikeDescription,
           a.Status,
           a.Notes
    FROM Appointment a
    JOIN Staff       m  ON m.StaffID        = a.MechanicID
    JOIN Customer    c  ON c.CustomerID     = a.CustomerID
    JOIN ServiceType st ON st.ServiceTypeID = a.ServiceTypeID
    WHERE CAST(a.StartTime AS DATE) = @Day
    ORDER BY a.StartTime, m.FirstName;
END
GO

CREATE OR ALTER PROCEDURE usp_Appointment_GetForCustomer
    @CustomerID INT
AS
BEGIN
    SELECT a.AppointmentID, a.StartTime, a.EndTime,
           m.FirstName + ' ' + m.LastName AS Mechanic,
           st.Name AS Service, st.Price, a.BikeDescription, a.Status
    FROM Appointment a
    JOIN Staff       m  ON m.StaffID        = a.MechanicID
    JOIN ServiceType st ON st.ServiceTypeID = a.ServiceTypeID
    WHERE a.CustomerID = @CustomerID
    ORDER BY a.StartTime DESC;
END
GO

CREATE OR ALTER PROCEDURE usp_Appointment_Cancel
    @AppointmentID INT,
    @Message VARCHAR(200) OUTPUT
AS
BEGIN
    SET @Message = '';
    -- A cancel is a status change.  The row stays: it is the shop's history.
    IF NOT EXISTS (SELECT * FROM Appointment
        WHERE AppointmentID = @AppointmentID AND Status = 'Booked')
    BEGIN
        SET @Message = 'Only an open booking can be cancelled.';
        RETURN;
    END

    UPDATE Appointment
    SET Status = 'Cancelled'
    WHERE AppointmentID = @AppointmentID AND Status = 'Booked';
END
GO

CREATE OR ALTER PROCEDURE usp_Appointment_MarkDone
    @AppointmentID INT,
    @Message VARCHAR(200) OUTPUT
AS
BEGIN
    SET @Message = '';
    IF NOT EXISTS (SELECT * FROM Appointment
        WHERE AppointmentID = @AppointmentID AND Status = 'Booked')
    BEGIN
        SET @Message = 'Only an open booking can be marked done.';
        RETURN;
    END

    UPDATE Appointment
    SET Status = 'Done'
    WHERE AppointmentID = @AppointmentID AND Status = 'Booked';
END
GO

/* ---- Bike (stock shape 2: unique items; also the hire fleet) ---- */

CREATE OR ALTER PROCEDURE usp_Bike_GetAll
    @Purpose VARCHAR(4)      -- 'Hire', 'Sale' or NULL for every bike
AS
BEGIN
    SELECT b.BikeID, b.FrameNumber,
           b.Make + ' ' + b.Model AS Bike,
           b.Size, b.Colour, b.Purpose, b.DailyRate, b.SalePrice, b.Status,
           c.FirstName + ' ' + c.LastName AS Customer,
           b.SoldOn
    FROM Bike b
    LEFT JOIN Customer c ON c.CustomerID = b.CustomerID
    WHERE @Purpose IS NULL OR b.Purpose = @Purpose
    ORDER BY b.Purpose, b.Make, b.Model, b.Size;
END
GO

CREATE OR ALTER PROCEDURE usp_Bike_GetAvailableForHire
    @StartDate DATE,
    @EndDate   DATE
AS
BEGIN
    SELECT b.BikeID,
           b.Make + ' ' + b.Model + ' · ' + b.Size + ' · ' + b.Colour + ' ('
               + b.FrameNumber + ')' AS Display,
           b.DailyRate
    FROM Bike b
    WHERE b.Purpose = 'Hire'
      AND b.Status  = 'Available'
      AND NOT EXISTS (SELECT *
                      FROM Hire h
                      WHERE h.BikeID = b.BikeID
                        AND h.Status IN ('Booked', 'Out')
                        AND @StartDate < h.EndDate
                        AND @EndDate   > h.StartDate)
    ORDER BY b.Make, b.Model, b.Size;
END
GO

CREATE OR ALTER PROCEDURE usp_Bike_Add
    @FrameNumber VARCHAR(20),
    @Make        VARCHAR(30),
    @Model       VARCHAR(40),
    @Size        VARCHAR(2),
    @Colour      VARCHAR(20),
    @Purpose     VARCHAR(4),
    @DailyRate   DECIMAL(6,2),
    @SalePrice   DECIMAL(8,2),
    @NewBikeID   INT OUTPUT,
    @Message VARCHAR(200) OUTPUT
AS
BEGIN
    SET @Message = '';
    IF EXISTS (SELECT * FROM Bike WHERE FrameNumber = @FrameNumber)
    BEGIN
        SET @Message = 'A bike with that frame number is already on record.';
        RETURN;
    END

    INSERT INTO Bike (FrameNumber, Make, Model, Size, Colour, Purpose,
        DailyRate, SalePrice)
    VALUES (@FrameNumber, @Make, @Model, @Size, @Colour, @Purpose, @DailyRate,
        @SalePrice);
    SET @NewBikeID = SCOPE_IDENTITY();
END
GO

CREATE OR ALTER PROCEDURE usp_Bike_Reserve
    @BikeID     INT,
    @CustomerID INT,
    @Message VARCHAR(200) OUTPUT
AS
BEGIN
    SET @Message = '';
    IF NOT EXISTS (SELECT * FROM Bike WHERE BikeID = @BikeID
        AND Purpose = 'Sale' AND Status = 'Available')
    BEGIN
        SET @Message = 'Only an available bike for sale can be reserved.';
        RETURN;
    END

    UPDATE Bike
    SET Status = 'Reserved', CustomerID = @CustomerID
    WHERE BikeID = @BikeID AND Purpose = 'Sale' AND Status = 'Available';
END
GO

CREATE OR ALTER PROCEDURE usp_Bike_Unreserve
    @BikeID INT,
    @Message VARCHAR(200) OUTPUT
AS
BEGIN
    SET @Message = '';
    -- Back to stock: the reservation is dropped and the bike is for sale again.
    IF NOT EXISTS (SELECT * FROM Bike WHERE BikeID = @BikeID
        AND Status = 'Reserved')
    BEGIN
        SET @Message = 'That bike is not reserved.';
        RETURN;
    END

    UPDATE Bike
    SET Status = 'Available', CustomerID = NULL
    WHERE BikeID = @BikeID AND Status = 'Reserved';
END
GO

CREATE OR ALTER PROCEDURE usp_Bike_Sell
    @BikeID     INT,
    @CustomerID INT,
    @Message VARCHAR(200) OUTPUT
AS
BEGIN
    SET @Message = '';
    IF EXISTS (SELECT * FROM Bike WHERE BikeID = @BikeID AND Status = 'Sold')
    BEGIN
        SET @Message = 'That bike has already been sold.';
        RETURN;
    END
    IF EXISTS (SELECT * FROM Bike WHERE BikeID = @BikeID
        AND Status = 'Reserved' AND CustomerID <> @CustomerID)
    BEGIN
        SET @Message = 'That bike is reserved for another customer.';
        RETURN;
    END

    -- The WHERE clause only matches a bike that can still be sold, so a bike is
    -- sold once.
    IF NOT EXISTS (SELECT * FROM Bike WHERE BikeID = @BikeID
        AND Purpose = 'Sale' AND Status IN ('Available', 'Reserved'))
    BEGIN
        SET @Message = 'That bike is not for sale right now.';
        RETURN;
    END

    UPDATE Bike
    SET Status = 'Sold', CustomerID = @CustomerID,
        SoldOn = CAST(GETDATE() AS DATE)
    WHERE BikeID = @BikeID AND Purpose = 'Sale'
        AND Status IN ('Available', 'Reserved');
END
GO

CREATE OR ALTER PROCEDURE usp_Bike_SetRepair
    @BikeID   INT,
    @InRepair BIT,
    @Message VARCHAR(200) OUTPUT
AS
BEGIN
    SET @Message = '';
    IF @InRepair = 1
    BEGIN
        -- Only a bike that is available can go into repair.
        IF NOT EXISTS (SELECT * FROM Bike WHERE BikeID = @BikeID
            AND Status = 'Available')
        BEGIN
            SET @Message = 'Only an available bike can go into repair.';
            RETURN;
        END
        UPDATE Bike SET Status = 'In repair' WHERE BikeID = @BikeID;
    END
    ELSE
    BEGIN
        -- Only a bike that is in repair can come back.
        IF NOT EXISTS (SELECT * FROM Bike WHERE BikeID = @BikeID
            AND Status = 'In repair')
        BEGIN
            SET @Message = 'Only a bike in repair can come back.';
            RETURN;
        END
        UPDATE Bike SET Status = 'Available' WHERE BikeID = @BikeID;
    END
END
GO

/* ---- Hire (booking shape 2: a date range on one bike) ---- */

CREATE OR ALTER PROCEDURE usp_Hire_Add
    @BikeID          INT,
    @CustomerID      INT,
    @StartDate       DATE,
    @EndDate         DATE,
    @DepositPaid     DECIMAL(8,2),
    @BookedByStaffID INT,
    @NewHireID       INT OUTPUT,
    @Message VARCHAR(200) OUTPUT
AS
BEGIN
    SET @Message = '';

    DECLARE @DailyRate DECIMAL(6,2), @Purpose VARCHAR(4), @Status VARCHAR(10);
    SELECT @DailyRate = DailyRate, @Purpose = Purpose, @Status = Status
    FROM Bike
    WHERE BikeID = @BikeID;

    IF @Purpose IS NULL OR @Purpose <> 'Hire'
    BEGIN
        SET @Message = 'Choose a hire bike.';
        RETURN;
    END
    IF @Status <> 'Available'
    BEGIN
        SET @Message = 'That bike is not available for hire.';
        RETURN;
    END
    IF @EndDate <= @StartDate
    BEGIN
        SET @Message = 'The return date must be after the start date.';
        RETURN;
    END
    IF @StartDate < CAST(GETDATE() AS DATE)
    BEGIN
        SET @Message = 'The start date has already passed.';
        RETURN;
    END

    DECLARE @Days INT;
    SET @Days = DATEDIFF(DAY, @StartDate, @EndDate);
    DECLARE @TotalCost DECIMAL(8,2);
    SET @TotalCost = @Days * @DailyRate;
    DECLARE @MinDeposit DECIMAL(8,2);
    SET @MinDeposit = ROUND(@TotalCost * 0.20, 2);

    IF @DepositPaid < @MinDeposit
    BEGIN
        SET @Message = 'The deposit must be at least £'
            + CAST(@MinDeposit AS VARCHAR)
            + ' (20% of £' + CAST(@TotalCost AS VARCHAR) + ').';
        RETURN;
    END

    IF EXISTS (SELECT *
               FROM Hire
               WHERE BikeID = @BikeID
                 AND Status IN ('Booked', 'Out')
                 -- same rule as appointments, with dates
                 AND @StartDate < EndDate
                 AND @EndDate   > StartDate)
    BEGIN
        SET @Message = 'That bike is already out on those dates.';
        RETURN;
    END

    INSERT INTO Hire (BikeID, CustomerID, StartDate, EndDate, TotalCost,
        DepositPaid, BookedByStaffID)
    VALUES (@BikeID, @CustomerID, @StartDate, @EndDate, @TotalCost,
        @DepositPaid, @BookedByStaffID);

    SET @NewHireID = SCOPE_IDENTITY();
END
GO

CREATE OR ALTER PROCEDURE usp_Hire_GetByDateRange
    @FromDate DATE,
    @ToDate   DATE
AS
BEGIN
    SELECT h.HireID,
           b.Make + ' ' + b.Model + ' (' + b.Size + ')' AS Bike,
           c.FirstName + ' ' + c.LastName AS Customer,
           h.StartDate, h.EndDate,
           DATEDIFF(DAY, h.StartDate, h.EndDate) AS Days,
           h.TotalCost, h.DepositPaid, h.Status
    FROM Hire h
    JOIN Bike     b ON b.BikeID     = h.BikeID
    JOIN Customer c ON c.CustomerID = h.CustomerID
    WHERE h.StartDate <= @ToDate AND h.EndDate >= @FromDate
    ORDER BY h.StartDate, b.Make;
END
GO

CREATE OR ALTER PROCEDURE usp_Hire_GetForBike
    @BikeID INT
AS
BEGIN
    SELECT h.HireID, c.FirstName + ' ' + c.LastName AS Customer,
           h.StartDate, h.EndDate, h.TotalCost, h.DepositPaid, h.Status
    FROM Hire h
    JOIN Customer c ON c.CustomerID = h.CustomerID
    WHERE h.BikeID = @BikeID
    ORDER BY h.StartDate DESC;
END
GO

CREATE OR ALTER PROCEDURE usp_Hire_CheckOut
    @HireID INT,
    @Message VARCHAR(200) OUTPUT
AS
BEGIN
    SET @Message = '';
    IF NOT EXISTS (SELECT * FROM Hire WHERE HireID = @HireID
        AND Status = 'Booked')
    BEGIN
        SET @Message = 'Only a booked hire can be checked out.';
        RETURN;
    END
    UPDATE Hire SET Status = 'Out' WHERE HireID = @HireID AND Status = 'Booked';
END
GO

CREATE OR ALTER PROCEDURE usp_Hire_Return
    @HireID INT,
    @Message VARCHAR(200) OUTPUT
AS
BEGIN
    SET @Message = '';
    IF NOT EXISTS (SELECT * FROM Hire WHERE HireID = @HireID AND Status = 'Out')
    BEGIN
        SET @Message = 'Only a hire that is out can be returned.';
        RETURN;
    END
    UPDATE Hire SET Status = 'Returned' WHERE HireID = @HireID
        AND Status = 'Out';
END
GO

CREATE OR ALTER PROCEDURE usp_Hire_Cancel
    @HireID INT,
    @Message VARCHAR(200) OUTPUT
AS
BEGIN
    SET @Message = '';
    IF NOT EXISTS (SELECT * FROM Hire WHERE HireID = @HireID
        AND Status = 'Booked')
    BEGIN
        SET @Message = 'Only a booked hire can be cancelled.';
        RETURN;
    END
    UPDATE Hire SET Status = 'Cancelled' WHERE HireID = @HireID
        AND Status = 'Booked';
END
GO

/* ---- Supplier ---- */

CREATE OR ALTER PROCEDURE usp_Supplier_GetAll
AS
BEGIN
    SELECT SupplierID, Name, Phone, Email
    FROM Supplier
    ORDER BY Name;
END
GO

CREATE OR ALTER PROCEDURE usp_Supplier_Add
    @Name          VARCHAR(60),
    @Phone         VARCHAR(15),
    @Email         VARCHAR(100),
    @NewSupplierID INT OUTPUT,
    @Message VARCHAR(200) OUTPUT
AS
BEGIN
    SET @Message = '';
    INSERT INTO Supplier (Name, Phone, Email)
    VALUES (@Name, @Phone, @Email);
    SET @NewSupplierID = SCOPE_IDENTITY();
END
GO

/* ---- Part (stock shape 1: counted items) ---- */

CREATE OR ALTER PROCEDURE usp_Part_GetAll
AS
BEGIN
    SELECT p.PartID, p.PartCode, p.Name, s.Name AS Supplier,
           p.UnitCost, p.SellPrice, p.QtyInStock, p.ReorderLevel, p.ReorderQty,
           p.SupplierID
    FROM Part p
    JOIN Supplier s ON s.SupplierID = p.SupplierID
    ORDER BY p.Name;
END
GO

CREATE OR ALTER PROCEDURE usp_Part_GetReorderList
AS
BEGIN
    -- Parts at or below their reorder level that have no order on the way.
    SELECT p.PartID, p.PartCode, p.Name, s.Name AS Supplier, s.Phone
        AS SupplierPhone,
           p.QtyInStock, p.ReorderLevel, p.ReorderQty
    FROM Part p
    JOIN Supplier s ON s.SupplierID = p.SupplierID
    WHERE p.QtyInStock <= p.ReorderLevel
      AND NOT EXISTS (SELECT * FROM PartOrder o WHERE o.PartID = p.PartID
          AND o.Status = 'Ordered')
    ORDER BY s.Name, p.Name;
END
GO

CREATE OR ALTER PROCEDURE usp_Part_Add
    @PartCode     VARCHAR(12),
    @Name         VARCHAR(60),
    @SupplierID   INT,
    @UnitCost     DECIMAL(7,2),
    @SellPrice    DECIMAL(7,2),
    @QtyInStock   INT,
    @ReorderLevel INT,
    @ReorderQty   INT,
    @NewPartID    INT OUTPUT,
    @Message VARCHAR(200) OUTPUT
AS
BEGIN
    SET @Message = '';
    IF EXISTS (SELECT * FROM Part WHERE PartCode = @PartCode)
    BEGIN
        SET @Message = 'That part code is already in use.';
        RETURN;
    END

    INSERT INTO Part (PartCode, Name, SupplierID, UnitCost, SellPrice,
        QtyInStock, ReorderLevel, ReorderQty)
    VALUES (@PartCode, @Name, @SupplierID, @UnitCost, @SellPrice, @QtyInStock,
        @ReorderLevel, @ReorderQty);
    SET @NewPartID = SCOPE_IDENTITY();
END
GO

CREATE OR ALTER PROCEDURE usp_Part_Update
    @PartID       INT,
    @Name         VARCHAR(60),
    @SupplierID   INT,
    @UnitCost     DECIMAL(7,2),
    @SellPrice    DECIMAL(7,2),
    @ReorderLevel INT,
    @ReorderQty   INT,
    @Message VARCHAR(200) OUTPUT
AS
BEGIN
    SET @Message = '';
    -- No QtyInStock here on purpose: stock only moves through sales, deliveries
    -- and refunds.
    UPDATE Part
    SET Name = @Name, SupplierID = @SupplierID, UnitCost = @UnitCost,
        SellPrice = @SellPrice,
        ReorderLevel = @ReorderLevel, ReorderQty = @ReorderQty
    WHERE PartID = @PartID;
END
GO

/* ---- PartOrder (stock in) ---- */

CREATE OR ALTER PROCEDURE usp_PartOrder_Place
    @PartID          INT,
    @QtyOrdered      INT,
    @ExpectedOn      DATE,
    @PlacedByStaffID INT,
    @NewPartOrderID  INT OUTPUT,
    @Message VARCHAR(200) OUTPUT
AS
BEGIN
    SET @Message = '';
    IF @QtyOrdered <= 0
    BEGIN
        SET @Message = 'Order at least one.';
        RETURN;
    END

    INSERT INTO PartOrder (PartID, QtyOrdered, ExpectedOn, PlacedByStaffID)
    VALUES (@PartID, @QtyOrdered, @ExpectedOn, @PlacedByStaffID);
    SET @NewPartOrderID = SCOPE_IDENTITY();
END
GO

CREATE OR ALTER PROCEDURE usp_PartOrder_Receive
    @PartOrderID INT,
    @QtyReceived INT,
    @Message VARCHAR(200) OUTPUT
AS
BEGIN
    SET @Message = '';

    IF @QtyReceived < 0
    BEGIN
        SET @Message = 'The quantity received cannot be negative.';
        RETURN;
    END

    DECLARE @PartID INT;
    SELECT @PartID = PartID FROM PartOrder WHERE PartOrderID = @PartOrderID
        AND Status = 'Ordered';
    IF @PartID IS NULL
    BEGIN
        SET @Message = 'That order is not open.';
        RETURN;
    END

    -- Two changes that must both happen: the order is closed and the stock goes
    -- up.
    UPDATE PartOrder
    SET Status = 'Received', ReceivedOn = CAST(GETDATE() AS DATE),
        QtyReceived = @QtyReceived
    WHERE PartOrderID = @PartOrderID;

    UPDATE Part
    SET QtyInStock = QtyInStock + @QtyReceived
    WHERE PartID = @PartID;
END
GO

CREATE OR ALTER PROCEDURE usp_PartOrder_Cancel
    @PartOrderID INT,
    @Message VARCHAR(200) OUTPUT
AS
BEGIN
    SET @Message = '';
    IF NOT EXISTS (SELECT * FROM PartOrder WHERE PartOrderID = @PartOrderID
        AND Status = 'Ordered')
    BEGIN
        SET @Message = 'Only an open order can be cancelled.';
        RETURN;
    END
    UPDATE PartOrder SET Status = 'Cancelled' WHERE PartOrderID = @PartOrderID
        AND Status = 'Ordered';
END
GO

CREATE OR ALTER PROCEDURE usp_PartOrder_GetOpen
AS
BEGIN
    SELECT o.PartOrderID, p.PartCode, p.Name AS Part, s.Name AS Supplier,
           o.QtyOrdered, o.OrderedOn, o.ExpectedOn,
           st.FirstName + ' ' + st.LastName AS PlacedBy
    FROM PartOrder o
    JOIN Part     p  ON p.PartID      = o.PartID
    JOIN Supplier s  ON s.SupplierID  = p.SupplierID
    JOIN Staff    st ON st.StaffID    = o.PlacedByStaffID
    WHERE o.Status = 'Ordered'
    ORDER BY o.ExpectedOn, p.Name;
END
GO

CREATE OR ALTER PROCEDURE usp_PartOrder_GetAll
AS
BEGIN
    SELECT o.PartOrderID, p.PartCode, p.Name AS Part, s.Name AS Supplier,
           o.QtyOrdered, o.OrderedOn, o.ExpectedOn, o.ReceivedOn, o.QtyReceived,
               o.Status
    FROM PartOrder o
    JOIN Part     p ON p.PartID     = o.PartID
    JOIN Supplier s ON s.SupplierID = p.SupplierID
    ORDER BY o.OrderedOn DESC, o.PartOrderID DESC;
END
GO

/* ---- PartSale (stock out) ---- */

CREATE OR ALTER PROCEDURE usp_PartSale_Add
    @PartID        INT,
    @CustomerID    INT,          -- NULL for a walk-in customer
    @Quantity      INT,
    @SoldByStaffID INT,
    @NewPartSaleID INT OUTPUT,
    @Message VARCHAR(200) OUTPUT
AS
BEGIN
    SET @Message = '';

    IF @Quantity <= 0
    BEGIN
        SET @Message = 'Sell at least one.';
        RETURN;
    END

    DECLARE @SellPrice DECIMAL(7,2), @InStock INT;
    SELECT @SellPrice = SellPrice, @InStock = QtyInStock FROM Part
        WHERE PartID = @PartID;
    IF @SellPrice IS NULL
    BEGIN
        SET @Message = 'Choose a part.';
        RETURN;
    END

    -- Is there enough?  If not, refuse and stop.
    IF @InStock < @Quantity
    BEGIN
        SET @Message = 'Only ' + CAST(@InStock AS VARCHAR) + ' in stock.';
        RETURN;
    END

    -- Take the stock off.  The table's CHECK (QtyInStock >= 0) is the
    -- database's own backstop.
    UPDATE Part
    SET QtyInStock = QtyInStock - @Quantity
    WHERE PartID = @PartID;

    INSERT INTO PartSale (PartID, CustomerID, Quantity, UnitPrice,
        SoldByStaffID)
    VALUES (@PartID, @CustomerID, @Quantity, @SellPrice, @SoldByStaffID);

    SET @NewPartSaleID = SCOPE_IDENTITY();
END
GO

CREATE OR ALTER PROCEDURE usp_PartSale_Refund
    @PartSaleID INT,
    @Message VARCHAR(200) OUTPUT
AS
BEGIN
    SET @Message = '';

    DECLARE @PartID INT, @Quantity INT;
    SELECT @PartID = PartID, @Quantity = Quantity
    FROM PartSale
    WHERE PartSaleID = @PartSaleID AND Status = 'Sold';
    IF @PartID IS NULL
    BEGIN
        SET @Message =
            'That sale has already been refunded, or does not exist.';
        RETURN;
    END

    UPDATE PartSale SET Status = 'Refunded' WHERE PartSaleID = @PartSaleID;
    -- stock goes back
    UPDATE Part SET QtyInStock = QtyInStock + @Quantity WHERE PartID = @PartID;
END
GO

CREATE OR ALTER PROCEDURE usp_PartSale_GetByDateRange
    @FromDate DATE,
    @ToDate   DATE
AS
BEGIN
    SELECT ps.PartSaleID, ps.SoldOn, p.PartCode, p.Name AS Part,
           ISNULL(c.FirstName + ' ' + c.LastName, 'Walk-in') AS Customer,
           ps.Quantity, ps.UnitPrice,
           ps.Quantity * ps.UnitPrice AS Total,
           st.FirstName + ' ' + st.LastName AS SoldBy,
           ps.Status
    FROM PartSale ps
    JOIN Part      p  ON p.PartID      = ps.PartID
    LEFT JOIN Customer c ON c.CustomerID = ps.CustomerID
    JOIN Staff     st ON st.StaffID    = ps.SoldByStaffID
    WHERE CAST(ps.SoldOn AS DATE) BETWEEN @FromDate AND @ToDate
    ORDER BY ps.SoldOn DESC;
END
GO

/* ---- Reports (across tables, for a date range) ---- */

CREATE OR ALTER PROCEDURE usp_Report_MechanicWorkload
    @FromDate DATE,
    @ToDate   DATE
AS
BEGIN
    SELECT s.FirstName + ' ' + s.LastName AS Mechanic,
           COUNT(a.AppointmentID) AS JobsDone,
           CAST(ISNULL(SUM(DATEDIFF(MINUTE, a.StartTime, a.EndTime)), 0) / 60.0
               AS DECIMAL(6,1)) AS HoursWorked,
           ISNULL(SUM(st.Price), 0) AS Income
    FROM Staff s
    LEFT JOIN Appointment a
           ON a.MechanicID = s.StaffID
          AND a.Status = 'Done'
          AND CAST(a.StartTime AS DATE) BETWEEN @FromDate AND @ToDate
    LEFT JOIN ServiceType st ON st.ServiceTypeID = a.ServiceTypeID
    WHERE s.Role = 'Mechanic'
    GROUP BY s.StaffID, s.FirstName, s.LastName
    ORDER BY Income DESC, Mechanic;
END
GO

CREATE OR ALTER PROCEDURE usp_Report_Income
    @FromDate DATE,
    @ToDate   DATE
AS
BEGIN
    SELECT [Day], Source, Items, Income
    FROM (
        SELECT CAST(a.StartTime AS DATE) AS [Day], 'Workshop' AS Source,
               COUNT(*) AS Items, SUM(st.Price) AS Income
        FROM Appointment a
        JOIN ServiceType st ON st.ServiceTypeID = a.ServiceTypeID
        WHERE a.Status = 'Done' AND CAST(a.StartTime AS DATE) BETWEEN @FromDate
            AND @ToDate
        GROUP BY CAST(a.StartTime AS DATE)

        UNION ALL

        SELECT h.EndDate, 'Bike hire', COUNT(*), SUM(h.TotalCost)
        FROM Hire h
        WHERE h.Status = 'Returned' AND h.EndDate BETWEEN @FromDate AND @ToDate
        GROUP BY h.EndDate

        UNION ALL

        SELECT CAST(ps.SoldOn AS DATE), 'Parts', SUM(ps.Quantity),
            SUM(ps.Quantity * ps.UnitPrice)
        FROM PartSale ps
        WHERE ps.Status = 'Sold' AND CAST(ps.SoldOn AS DATE) BETWEEN @FromDate
            AND @ToDate
        GROUP BY CAST(ps.SoldOn AS DATE)
    ) AS income
    ORDER BY [Day], Source;
END
GO

PRINT 'BikeShop is ready.';
GO
