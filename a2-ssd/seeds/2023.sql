-- seeds/2023.sql — Thompsons' Nursery (CCEA A2 SSD 2023). SQLite dialect. Dates are relative to today.
-- 2023-b: three customers registered more than six months ago have never ordered; one registered two months ago has not
-- ordered yet either (trap: too recent). 2023-c: sales across four sale areas, so the profit totals differ.
PRAGMA foreign_keys = ON;
CREATE TABLE CUSTOMER (CustID INTEGER PRIMARY KEY, CustForename TEXT COLLATE NOCASE, CustSurname TEXT COLLATE NOCASE, CustDOB DATE, CustAddress1 TEXT COLLATE NOCASE, CustAddress2 TEXT COLLATE NOCASE, CustPostCode TEXT COLLATE NOCASE, CustPhoneNo TEXT COLLATE NOCASE, RegistrationDate DATE);
CREATE TABLE SALEAREA (SaleAreaID INTEGER PRIMARY KEY, SaleAreaDesc TEXT COLLATE NOCASE);
CREATE TABLE SUPPLIER (SupplierID INTEGER PRIMARY KEY, SupplierName TEXT COLLATE NOCASE, SupplierPhoneNo TEXT COLLATE NOCASE);
CREATE TABLE STOCK (StockID INTEGER PRIMARY KEY, StockDescription TEXT COLLATE NOCASE, CostPrice REAL, SalePrice REAL, QtyInStock INTEGER, ReorderLevel INTEGER, SaleAreaID INTEGER REFERENCES SALEAREA, SupplierID INTEGER REFERENCES SUPPLIER);
CREATE TABLE SUPPLIERSTOCKORDER (SupStockOrderID INTEGER PRIMARY KEY AUTOINCREMENT, SupplierID INTEGER REFERENCES SUPPLIER, SupStockOrderDate DATE, EstDeliveryDate DATE, DeliveredYN TEXT COLLATE NOCASE DEFAULT 'N', CHECK (EstDeliveryDate >= SupStockOrderDate));
CREATE TABLE SUPSTOCKORDDETAILS (SupStockOrderID INTEGER REFERENCES SUPPLIERSTOCKORDER, StockID INTEGER REFERENCES STOCK, Qty INTEGER);
CREATE TABLE CUSTOMERORDER (OrderID INTEGER PRIMARY KEY, CustID INTEGER REFERENCES CUSTOMER, OrderDate DATE);
CREATE TABLE CUSTORDERDETAILS (OrderID INTEGER REFERENCES CUSTOMERORDER, StockID INTEGER REFERENCES STOCK, Qty INTEGER);
INSERT INTO CUSTOMER VALUES
 (1,'Maria','Byrne','1975-03-14','5 Orchard Way','Newry','BT356AB','07700900201',date('now','-900 days')),
 (2,'Kevin','Duffy','1968-11-02','22 Rock Road','Warrenpoint','BT343XY','07700900202',date('now','-420 days')),
 (3,'Sinead','Fitzpatrick','1982-07-21','9 Forkhill Road','Newry','BT358LT','07700900203',date('now','-300 days')),
 (4,'Paul','Grimley','1990-01-30','14 Mill Street','Bessbrook','BT357DS','07700900204',date('now','-250 days')),
 (5,'Anne','Hagan','1959-05-09','3 Chapel Hill','Mayobridge','BT342EX','07700900205',date('now','-600 days')),
 (6,'Conor','Loughran','1987-09-17','41 Monaghan Row','Newry','BT356HR','07700900206',date('now','-60 days')),
 (7,'Bronagh','Magennis','1979-12-05','8 Bridge Street','Kilkeel','BT344AH','07700900207',date('now','-500 days')),
 (8,'Declan','Nelson','1971-04-26','17 Newtown Road','Rostrevor','BT343BG','07700900208',date('now','-30 days')),
 (9,'Eilis','O''Rourke','1993-08-11','2 Parkhead Road','Warrenpoint','BT343LQ','07700900209',date('now','-730 days')),
 (10,'Brendan','Aiken','1965-02-19','60 Dublin Road','Newry','BT356QX','07700900210',date('now','-380 days'));
INSERT INTO SALEAREA VALUES (1,'Bedding Plants'),(2,'Shrubs & Trees'),(3,'Garden Tools'),(4,'Pots & Planters');
INSERT INTO SUPPLIER VALUES (1,'Lagan Growers','02890111001'),(2,'Mourne Nurseries','02841111002'),(3,'Toolmaster NI','02838111003');
INSERT INTO STOCK VALUES
 (1,'Pansy Tray (12)',3.20,6.99,40,15,1,1),
 (2,'Geranium Pot',1.10,2.99,60,20,1,1),
 (3,'Lavender Plant',2.40,5.49,25,10,1,2),
 (4,'Japanese Maple',18.00,39.99,6,3,2,2),
 (5,'Laurel Hedge 1m',6.50,14.99,30,10,2,2),
 (6,'Apple Tree',14.00,29.99,8,4,2,2),
 (7,'Garden Spade',9.00,21.99,12,5,3,3),
 (8,'Hose Reel 30m',11.50,24.99,10,4,3,3),
 (9,'Terracotta Pot 30cm',4.00,9.99,35,10,4,1),
 (10,'Glazed Planter',12.00,27.99,14,5,4,1);
INSERT INTO SUPPLIERSTOCKORDER (SupStockOrderID, SupplierID, SupStockOrderDate, EstDeliveryDate, DeliveredYN) VALUES
 (1,1,date('now','-30 days'),date('now','-25 days'),'Y'),
 (2,2,date('now','-12 days'),date('now','-5 days'),'Y'),
 (3,3,date('now','-4 days'),date('now','+3 days'),'N'),
 (4,1,date('now','-1 days'),date('now','+6 days'),'N');
INSERT INTO SUPSTOCKORDDETAILS VALUES (1,1,20),(1,2,40),(2,4,4),(2,5,20),(3,7,6),(3,8,4),(4,9,20),(4,10,6);
INSERT INTO CUSTOMERORDER VALUES
 (1,1,date('now','-200 days')),
 (2,2,date('now','-150 days')),
 (3,1,date('now','-90 days')),
 (4,5,date('now','-80 days')),
 (5,7,date('now','-45 days')),
 (6,10,date('now','-20 days')),
 (7,2,date('now','-10 days')),
 (8,8,date('now','-3 days'));
INSERT INTO CUSTORDERDETAILS VALUES
 (1,1,2),(1,9,1),
 (2,4,1),
 (3,2,6),(3,7,1),
 (4,5,10),
 (5,6,1),(5,10,2),
 (6,3,4),(6,8,1),
 (7,1,3),(7,2,4),
 (8,5,5),(8,9,2);
