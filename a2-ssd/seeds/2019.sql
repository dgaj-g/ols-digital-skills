-- seeds/2019.sql — The Woods (CCEA A2 SSD 2019). SQLite dialect. Dates are relative to today.
-- H1539 exists for the 2019-a UPDATE. Supplier 12 (Mourne Tools) has four items at or below their reorder level and two above;
-- other suppliers also have low items, so a WHERE without SupplierNo = 12 shows the wrong rows.
-- 2019-c: three supplier orders are not yet delivered (SupplierOrderDateDelivered is NULL).
PRAGMA foreign_keys = ON;
CREATE TABLE Category (CategoryNo INTEGER PRIMARY KEY, CategoryDescription TEXT COLLATE NOCASE);
CREATE TABLE Supplier (SupplierNo INTEGER PRIMARY KEY, SupplierName TEXT COLLATE NOCASE, DateStart DATE, Delivery_D_W TEXT COLLATE NOCASE, SupplierTelNo TEXT COLLATE NOCASE);
CREATE TABLE Stock (StockNo TEXT COLLATE NOCASE PRIMARY KEY, StockDescription TEXT COLLATE NOCASE, SupplierNo INTEGER REFERENCES Supplier, QtyInStock INTEGER, ReorderLevel INTEGER, ReorderQty INTEGER, CategoryNo INTEGER REFERENCES Category, StockPrice REAL, StockSalePrice REAL);
CREATE TABLE SupplierOrder (SupplierOrderNo INTEGER PRIMARY KEY, SupplierNo INTEGER REFERENCES Supplier, SupplierOrderDate DATE, SupplierOrderDateDelivered DATE);
CREATE TABLE SupplierStockOrder (SupplierOrderNo INTEGER REFERENCES SupplierOrder, StockNo TEXT COLLATE NOCASE REFERENCES Stock, OrderQty INTEGER, PRIMARY KEY (SupplierOrderNo, StockNo));
INSERT INTO Category VALUES (1,'Hand Tools'),(2,'Fixings'),(3,'Paint'),(4,'Garden'),(5,'Timber');
INSERT INTO Supplier VALUES
 (8,'Clanrye Timber',date('now','-2900 days'),'W','028 3026 4408'),
 (10,'Northern Paints',date('now','-1800 days'),'D','028 9032 4410'),
 (12,'Mourne Tools',date('now','-2200 days'),'W','028 4176 4412'),
 (15,'Ulster Fixings',date('now','-900 days'),'D','028 3833 4415'),
 (17,'Greenfield Garden Supplies',date('now','-400 days'),'W','028 3752 4417');
INSERT INTO Stock VALUES
 ('H1539','Claw Hammer 16oz',12,14,10,20,1,6.20,12.99),
 ('H1540','Hand Saw 22in',12,6,8,12,1,7.80,15.99),
 ('H1544','Screwdriver Set',12,3,5,10,1,9.40,19.99),
 ('F2201','Wood Screws 4x40 (200)',12,40,50,100,2,2.10,4.99),
 ('F2205','Wall Plugs (100)',12,120,60,100,2,0.90,2.49),
 ('G4410','Pruning Shears',12,5,5,10,4,5.60,11.99),
 ('F2210','Masonry Nails (100)',15,15,30,60,2,1.40,3.29),
 ('F2214','Coach Bolts M10 (10)',15,80,40,50,2,3.20,6.99),
 ('P3301','White Emulsion 5L',10,9,12,24,3,11.50,21.99),
 ('P3308','Wood Stain Oak 2.5L',10,30,10,20,3,8.90,17.49),
 ('T5101','Pine Batten 2.4m',8,25,40,80,5,1.60,3.49),
 ('T5107','Plywood Sheet 18mm',8,22,10,20,5,19.00,34.99),
 ('G4402','Compost 50L',17,12,20,40,4,3.10,6.99),
 ('G4406','Garden Rake',17,11,6,10,4,6.40,13.99);
INSERT INTO SupplierOrder VALUES
 (501,12,date('now','-60 days'),date('now','-55 days')),
 (502,10,date('now','-40 days'),date('now','-38 days')),
 (503,8,date('now','-21 days'),date('now','-16 days')),
 (504,15,date('now','-12 days'),NULL),
 (505,12,date('now','-9 days'),NULL),
 (506,17,date('now','-5 days'),date('now','-2 days')),
 (507,10,date('now','-3 days'),NULL),
 (508,8,date('now','-1 days'),date('now'));
INSERT INTO SupplierStockOrder VALUES
 (501,'H1539',20),(501,'F2201',100),
 (502,'P3301',24),
 (503,'T5101',80),(503,'T5107',20),
 (504,'F2210',60),(504,'F2214',50),
 (505,'H1540',12),(505,'H1544',10),(505,'G4410',10),
 (506,'G4402',40),
 (507,'P3301',24),(507,'P3308',20),
 (508,'T5101',40);
