-- seeds/2026.sql — Tinies (CCEA A2 SSD 2026). SQLite dialect. Dates are relative to today.
-- No 2026 part is a SELECT; this seed fills the DATA tab. Stock NAP and CRM exist and supplier 1 exists for 2026-c;
-- order 123 does not exist yet. SUPSTOCKORDERDETAILS (the mark scheme's spelling) is a view of SUPSTOCKORDDETAILS. ReorderLevel differs by site for the same item (2026-a).
PRAGMA foreign_keys = ON;
CREATE TABLE SUPPLIER (SupplierID INTEGER PRIMARY KEY, SupplierName TEXT COLLATE NOCASE, SupplierPhoneNo TEXT COLLATE NOCASE);
CREATE TABLE SITE (SiteID INTEGER PRIMARY KEY, SiteDesc TEXT COLLATE NOCASE);
CREATE TABLE STOCK (StockID TEXT COLLATE NOCASE PRIMARY KEY, StockDescription TEXT COLLATE NOCASE, CostPrice REAL, SalePrice REAL, SupplierID INTEGER REFERENCES SUPPLIER);
CREATE TABLE SITE_STOCK (SiteID INTEGER REFERENCES SITE, StockID TEXT COLLATE NOCASE REFERENCES STOCK, QtyInStock INTEGER, ReorderLevel INTEGER, PRIMARY KEY (SiteID, StockID));
CREATE TABLE SUPPLIERSTOCKORDER (SupStockOrderID INTEGER PRIMARY KEY AUTOINCREMENT, SupplierID INTEGER NOT NULL REFERENCES SUPPLIER, SupStockOrderDate DATE NOT NULL DEFAULT (date('now')), EstDeliveryDate DATE NOT NULL, DeliveredYN TEXT COLLATE NOCASE NOT NULL DEFAULT 'N', CHECK (EstDeliveryDate >= SupStockOrderDate));
CREATE TABLE SUPSTOCKORDDETAILS (SupStockOrderID INTEGER REFERENCES SUPPLIERSTOCKORDER, StockID TEXT COLLATE NOCASE REFERENCES STOCK, Qty INTEGER, PRIMARY KEY (SupStockOrderID, StockID));
CREATE VIEW SUPSTOCKORDERDETAILS AS SELECT * FROM SUPSTOCKORDDETAILS;
INSERT INTO SUPPLIER VALUES (1,'Little Ones Supplies','02830260401'),(2,'CareWell Wholesale','02890260402'),(3,'Play & Learn Ltd','02838260403');
INSERT INTO SITE VALUES (1,'Tinies 1, Monaghan Street, Newry'),(2,'Tinies 2, Rathfriland Road, Newry');
INSERT INTO STOCK VALUES
 ('NAP','Nappies (pack of 50)',6.20,7.99,1),
 ('CRM','Nappy cream',2.10,2.99,1),
 ('WIP','Baby wipes (pack of 80)',1.40,1.99,1),
 ('BIB','Bibs (pack of 5)',4.50,5.99,2),
 ('SUN','Sun cream SPF50',5.80,7.49,2),
 ('CRY','Crayons (box of 24)',1.90,2.49,3),
 ('PAI','Poster paint set',7.40,9.49,3),
 ('TIS','Tissues (box)',0.90,1.29,2);
INSERT INTO SITE_STOCK VALUES
 (1,'NAP',40,25),(2,'NAP',18,10),
 (1,'CRM',12,8),(2,'CRM',9,4),
 (1,'WIP',30,20),(2,'WIP',14,10),
 (1,'BIB',10,4),(2,'BIB',6,4),
 (1,'SUN',8,6),(2,'SUN',3,3),
 (1,'CRY',15,5),(2,'CRY',9,5),
 (1,'PAI',4,2),(2,'PAI',5,2),
 (1,'TIS',20,10),(2,'TIS',12,6);
INSERT INTO SUPPLIERSTOCKORDER (SupStockOrderID, SupplierID, SupStockOrderDate, EstDeliveryDate, DeliveredYN) VALUES
 (118,1,date('now','-30 days'),date('now','-26 days'),'Y'),
 (119,2,date('now','-21 days'),date('now','-18 days'),'Y'),
 (120,3,date('now','-14 days'),date('now','-8 days'),'Y'),
 (121,1,date('now','-6 days'),date('now','-2 days'),'Y'),
 (122,2,date('now','-2 days'),date('now','+3 days'),'N');
INSERT INTO SUPSTOCKORDDETAILS VALUES
 (118,'NAP',80),(118,'WIP',40),
 (119,'BIB',10),(119,'SUN',12),
 (120,'CRY',20),(120,'PAI',6),
 (121,'NAP',60),(121,'CRM',24),
 (122,'TIS',30),(122,'SUN',6);
