-- seeds/tinies-2.sql — Tinies question set 2 (stock control and supplier orders). SQLite dialect. Dates are relative to today.
-- Re-order list: four Tinies 1 items at or below their reorder level (one exactly at it); traps: low items at Tinies 2.
-- Last calendar month: supplier 12 ordered 130 units and supplier 10 110; traps: supplier 14 exactly 100, supplier 15 80,
-- supplier 17 150 two months ago, supplier 12 again this month. OrderNo 46 is the latest, so the next order is 47.
-- Glue sticks (G0021) and hand soap (H0033) have never been ordered. Orders 41, 44, 45 and 46 are not yet delivered
-- (supplier 12 has two). Suppliers 17 and 19 average 4 days from order to delivery; the rest 3 or fewer.
-- Supplier 12 placed 5 orders in the last six months; no other supplier more than 2. OrderDate defaults to today.
PRAGMA foreign_keys = ON;
CREATE TABLE SUPPLIER (SupplierID INTEGER PRIMARY KEY, SupplierName TEXT COLLATE NOCASE, SupplierTel TEXT COLLATE NOCASE, SupplierEmail TEXT COLLATE NOCASE);
CREATE TABLE CRECHE (CrecheID INTEGER PRIMARY KEY, CrecheName TEXT COLLATE NOCASE, CrecheLocation TEXT COLLATE NOCASE);
CREATE TABLE STOCK (StockID TEXT COLLATE NOCASE PRIMARY KEY, StockDesc TEXT COLLATE NOCASE, UnitCost REAL, ReorderLevel INTEGER, QtyInStock INTEGER, SupplierID INTEGER REFERENCES SUPPLIER, CrecheID INTEGER REFERENCES CRECHE);
CREATE TABLE STOCKORDER (OrderNo INTEGER PRIMARY KEY AUTOINCREMENT, OrderDate DATE DEFAULT (date('now')), DateDelivered DATE, SupplierID INTEGER REFERENCES SUPPLIER, CrecheID INTEGER REFERENCES CRECHE);
CREATE TABLE ORDERLINE (OrderNo INTEGER REFERENCES STOCKORDER, StockID TEXT COLLATE NOCASE REFERENCES STOCK, QtyOrdered INTEGER, PRIMARY KEY (OrderNo, StockID));
INSERT INTO SUPPLIER VALUES
 (10,'Mourne Baby Foods','028 4176 2210','orders@mournebaby.example'),
 (11,'CareWell Pharmacy Supplies','028 3026 5111','sales@carewell.example'),
 (12,'Little Ones Wholesale','028 9032 1412','trade@littleones.example'),
 (14,'Clean Sweep Hygiene','028 3835 0814','accounts@cleansweep.example'),
 (15,'Snack Shack NI','028 3752 1915','hello@snackshack.example'),
 (17,'Play & Learn Ltd','028 9267 7017','orders@playlearn.example'),
 (19,'Tiny Threads','028 4461 2019','sales@tinythreads.example');
INSERT INTO CRECHE VALUES (1,'Tinies 1','Monaghan Street, Newry'),(2,'Tinies 2','Rathfriland Road, Newry');
INSERT INTO STOCK VALUES
 ('N0102','Nappies',11.50,20,40,12,1),
 ('W0044','Baby wipes',2.10,10,6,12,1),
 ('S0017','Snack boxes',4.80,8,8,15,1),
 ('F0088','Formula milk',9.75,5,3,10,1),
 ('B0012','Bibs',5.40,4,2,19,1),
 ('C0031','Nappy cream',3.20,6,12,11,1),
 ('T0005','Tissues',1.15,10,20,14,1),
 ('P0210','Poster paint',7.40,4,7,17,1),
 ('L0009','Crayons',1.90,5,15,17,1),
 ('N0202','Nappies',11.50,15,5,12,2),
 ('W0144','Baby wipes',2.10,10,18,12,2),
 ('S0117','Snack boxes',4.80,8,14,15,2),
 ('F0188','Formula milk',9.75,5,9,10,2),
 ('K0045','Kitchen roll',6.30,6,2,14,2),
 ('P0310','Poster paint',7.40,4,9,17,2),
 ('G0021','Glue sticks',0.95,6,10,17,1),
 ('H0033','Hand soap',2.60,5,7,14,2);
INSERT INTO STOCKORDER (OrderNo, OrderDate, DateDelivered, SupplierID, CrecheID) VALUES
 (31,date('now','start of month','-4 months','+3 days'),date('now','start of month','-4 months','+6 days'),12,1),
 (32,date('now','start of month','-4 months','+10 days'),date('now','start of month','-4 months','+14 days'),19,1),
 (33,date('now','start of month','-3 months','+5 days'),date('now','start of month','-3 months','+8 days'),14,1),
 (34,date('now','start of month','-2 months','+8 days'),date('now','start of month','-2 months','+12 days'),17,1),
 (35,date('now','start of month','-2 months','+15 days'),date('now','start of month','-2 months','+18 days'),11,1),
 (36,date('now','start of month','-1 month','+2 days'),date('now','start of month','-1 month','+5 days'),12,1),
 (37,date('now','start of month','-1 month','+4 days'),date('now','start of month','-1 month','+6 days'),15,1),
 (38,date('now','start of month','-1 month','+6 days'),date('now','start of month','-1 month','+9 days'),12,2),
 (39,date('now','start of month','-1 month','+9 days'),date('now','start of month','-1 month','+12 days'),10,1),
 (40,date('now','start of month','-1 month','+12 days'),date('now','start of month','-1 month','+14 days'),15,2),
 (41,date('now','start of month','-1 month','+16 days'),NULL,12,1),
 (42,date('now','start of month','-1 month','+19 days'),date('now','start of month','-1 month','+22 days'),14,2),
 (43,date('now','start of month','-1 month','+22 days'),date('now','start of month','-1 month','+26 days'),19,1),
 (44,date('now','start of month','-1 month','+25 days'),NULL,17,2),
 (45,date('now','start of month'),NULL,12,1),
 (46,date('now'),NULL,11,1);
INSERT INTO ORDERLINE VALUES
 (31,'N0102',50),(31,'W0044',40),
 (32,'B0012',10),
 (33,'T0005',30),
 (34,'P0210',80),(34,'L0009',70),
 (35,'C0031',24),
 (36,'N0102',40),(36,'W0044',30),
 (37,'S0017',50),
 (38,'N0202',25),(38,'W0144',15),
 (39,'F0088',60),(39,'F0188',50),
 (40,'S0117',30),
 (41,'N0102',20),
 (42,'T0005',40),(42,'K0045',60),
 (43,'B0012',12),
 (44,'P0310',20),
 (45,'N0102',30),
 (46,'C0031',12);
