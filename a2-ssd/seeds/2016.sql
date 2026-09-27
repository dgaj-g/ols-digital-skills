-- seeds/2016.sql — Harris Electrical (CCEA A2 SSD 2016). SQLite dialect.
-- The paper fixes 29 January 2016, so SALES dates sit in 2016. Staff 1, 2 and 3 each have more than 1,000 sales; staff 4 and 5 do not. Location 2 is the 'Outlet'.
PRAGMA foreign_keys = ON;
CREATE TABLE LOCATION (LocationID INTEGER PRIMARY KEY, LocationName TEXT COLLATE NOCASE, TelephoneNo TEXT COLLATE NOCASE);
CREATE TABLE STAFF (StaffID INTEGER PRIMARY KEY, Surname TEXT COLLATE NOCASE, Forename TEXT COLLATE NOCASE, Position TEXT COLLATE NOCASE, Salary REAL);
CREATE TABLE STOCK (StockID INTEGER PRIMARY KEY, Description TEXT COLLATE NOCASE, UnitCost REAL, StockLevel INTEGER, Price REAL);
CREATE TABLE SALES (SalesNo INTEGER PRIMARY KEY, SalesDate DATE, SalesTime TIME, LocationID INTEGER REFERENCES LOCATION, StaffID INTEGER REFERENCES STAFF);
CREATE TABLE SALESLINE (SalesNo INTEGER REFERENCES SALES, StockID INTEGER REFERENCES STOCK, Quantity INTEGER, PRIMARY KEY (SalesNo, StockID));
INSERT INTO LOCATION VALUES (1,'Newry','028 3026 2001'),(2,'Outlet','028 3026 2002'),(3,'Banbridge','028 4062 2003'),(4,'Warrenpoint','028 4175 2004');
INSERT INTO STAFF VALUES
 (1,'Harris','Paula','Manager',34000.00),
 (2,'Quinn','Sean','Sales',22500.00),
 (3,'O''Hare','Niamh','Sales',22500.00),
 (4,'Murphy','Conor','Sales',21000.00),
 (5,'Boyle','Eimear','Trainee',17500.00);
INSERT INTO STOCK VALUES
 (1,'Kettle 1.7L',12.50,40,24.99),
 (2,'Toaster 2-slice',15.00,35,29.99),
 (3,'LED Desk Lamp',8.20,60,18.50),
 (4,'Bluetooth Speaker',22.00,25,44.99),
 (5,'Hair Dryer 2000W',14.75,30,32.00),
 (6,'Extension Lead 4-way',3.90,120,9.99),
 (7,'Smart Plug',9.50,80,19.99),
 (8,'USB-C Charger',6.10,150,14.99),
 (9,'Electric Blanket',18.00,20,39.99),
 (10,'Microwave 800W',48.00,12,89.99),
 (11,'Iron Steam',16.40,28,34.99),
 (12,'Fan Heater',13.30,22,27.50);
-- Bulk sales: 3,800 rows. SalesNo 1..1200 → staff 1; 1201..2300 → staff 2; 2301..3350 → staff 3; 3351..3650 → staff 4; 3651..3800 → staff 5.
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i<3800)
INSERT INTO SALES SELECT i, date('2016-01-01', (i%120)||' days'), printf('%02d:%02d', 8+(i%10), (i*7)%60), (i%4)+1,
 CASE WHEN i<=1200 THEN 1 WHEN i<=2300 THEN 2 WHEN i<=3350 THEN 3 WHEN i<=3650 THEN 4 ELSE 5 END FROM n;
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i<3800)
INSERT INTO SALESLINE SELECT i, (i%12)+1, (i%3)+1 FROM n;
-- The 29 January 2016 story at the Outlet (location 2): five sales between 1 pm and 3 pm, plus one before and one after as traps.
INSERT INTO SALES VALUES
 (9001,'2016-01-29','12:30',2,2),
 (9002,'2016-01-29','13:15',2,2),
 (9003,'2016-01-29','13:40',2,3),
 (9004,'2016-01-29','14:05',2,2),
 (9005,'2016-01-29','14:30',2,3),
 (9006,'2016-01-29','14:55',2,2),
 (9007,'2016-01-29','15:30',2,3),
 (9008,'2016-01-29','13:50',1,1);
INSERT INTO SALESLINE VALUES (9001,1,1),(9002,4,1),(9002,8,2),(9003,10,1),(9004,7,3),(9005,2,1),(9005,6,2),(9006,5,1),(9007,3,1),(9008,9,1);
