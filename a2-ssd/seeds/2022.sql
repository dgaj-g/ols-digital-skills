-- seeds/2022.sql — Harpers (CCEA A2 SSD 2022). SQLite dialect. Dates are relative to today.
-- CUSTOMER is the paper's assumed table (customerID, customerForename, customerSurname, customerTelNo).
-- 2022-c: three cakes are due today; one has no decoration row, so an inner join to CAKEORDERDECOR drops it.
-- 2022-d: this year's orders, three of them with more than one cake type (orders stay inside the current year on any day).
-- collectedStaffID stays empty until a cake is collected.
PRAGMA foreign_keys = ON;
CREATE TABLE CUSTOMER (customerID INTEGER PRIMARY KEY, customerForename TEXT COLLATE NOCASE, customerSurname TEXT COLLATE NOCASE, customerTelNo TEXT COLLATE NOCASE);
CREATE TABLE OCCASION (occasionID INTEGER PRIMARY KEY, occasion TEXT COLLATE NOCASE, depositReqYN TEXT COLLATE NOCASE);
CREATE TABLE CAKETYPE (cakeTypeID INTEGER PRIMARY KEY, cakeType TEXT COLLATE NOCASE, costLayer REAL);
CREATE TABLE CAKESIZE (cakeSizeID INTEGER PRIMARY KEY, cakeSize TEXT COLLATE NOCASE, costIncreasePercent INTEGER);
CREATE TABLE CAKEORDER (cakeOrderID INTEGER PRIMARY KEY, cakeOrderDate DATE, dateRequired DATE, occasionID INTEGER REFERENCES OCCASION, shapeID INTEGER, cakeSizeID INTEGER REFERENCES CAKESIZE, fillingID INTEGER, icingID INTEGER, customerID INTEGER REFERENCES CUSTOMER, orderStaffID INTEGER, collectedStaffID INTEGER);
CREATE TABLE CAKEORDERDETAILS (cakeOrderID INTEGER REFERENCES CAKEORDER, cakeTypeID INTEGER REFERENCES CAKETYPE, noLayers INTEGER NOT NULL);
CREATE TABLE CAKEORDERDECOR (cakeOrderID INTEGER REFERENCES CAKEORDER, writing TEXT COLLATE NOCASE, decoration TEXT COLLATE NOCASE, skillCost REAL, deliveryCost REAL);
INSERT INTO CUSTOMER VALUES
 (1,'Aoibhinn','Clarke','07700 900101'),
 (2,'Barry','Doran','07700 900102'),
 (3,'Catherine','Ennis','07700 900103'),
 (4,'Dermot','Fegan','07700 900104'),
 (5,'Emma','Gribben','07700 900105'),
 (6,'Fergal','Hollywood','07700 900106'),
 (7,'Gemma','Irvine','07700 900107'),
 (8,'Harry','Jordan','07700 900108');
INSERT INTO OCCASION VALUES (1,'Birthday','N'),(2,'Wedding','Y'),(3,'Christening','Y'),(4,'Anniversary','N'),(5,'Retirement','N');
INSERT INTO CAKETYPE VALUES (1,'Victoria Sponge',8.00),(2,'Chocolate Fudge',9.50),(3,'Lemon Drizzle',8.50),(4,'Fruit Cake',11.00),(5,'Red Velvet',10.00);
INSERT INTO CAKESIZE VALUES (1,'6 inch',0),(2,'8 inch',20),(3,'10 inch',45),(4,'12 inch',70);
INSERT INTO CAKEORDER VALUES
 (201,max(date('now','-20 days'),date('now','start of year')),date('now'),1,1,2,1,1,1,3,NULL),
 (202,max(date('now','-15 days'),date('now','start of year')),date('now'),2,2,4,2,2,4,1,NULL),
 (203,max(date('now','-6 days'),date('now','start of year')),date('now'),3,1,1,1,3,6,2,NULL),
 (204,max(date('now','-9 days'),date('now','start of year')),date('now','+1 day'),1,3,2,3,1,2,3,NULL),
 (205,max(date('now','-40 days'),date('now','start of year')),max(date('now','-30 days'),date('now','start of year')),4,1,3,2,2,3,1,2),
 (206,max(date('now','-70 days'),date('now','start of year')),max(date('now','-60 days'),date('now','start of year')),5,2,2,1,1,5,2,3),
 (207,max(date('now','-100 days'),date('now','start of year')),max(date('now','-90 days'),date('now','start of year')),2,1,4,3,2,7,1,1),
 (208,max(date('now','-3 days'),date('now','start of year')),date('now','+4 days'),1,1,1,1,1,8,3,NULL),
 (209,date('now','start of year','-20 days'),date('now','start of year','-10 days'),1,2,2,2,1,1,2,3),
 (210,date('now','start of year','-45 days'),date('now','start of year','-30 days'),3,1,3,1,3,5,1,2);
INSERT INTO CAKEORDERDETAILS VALUES
 (201,2,2),
 (202,4,3),(202,1,2),
 (203,1,1),
 (204,5,2),
 (205,3,2),(205,2,1),
 (206,1,2),
 (207,4,3),(207,5,2),(207,1,1),
 (208,3,1),
 (209,2,2),(209,3,1),
 (210,1,2);
INSERT INTO CAKEORDERDECOR VALUES
 (201,'Happy 10th Birthday Niamh','Unicorn topper',6.00,0.00),
 (202,'Sean & Aine','Sugar roses',15.00,12.00),
 (204,'Happy Birthday Dad','Chocolate curls',4.00,0.00),
 (207,'Congratulations','Pearl piping',12.00,10.00),
 (209,'Happy Birthday Mum','Fresh berries',5.00,0.00);
