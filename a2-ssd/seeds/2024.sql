-- seeds/2024.sql — Total Cleaning Services (CCEA A2 SSD 2024). SQLite dialect. Dates are relative to today.
-- StartDate is on STAFF because 2024 (d) says to assume it has been added with values for existing staff.
-- Declan Downey is StaffID 3 with SpecialID 2 (for 2024-b) and no availability rows yet (for 2024-a).
-- 2024-d: SpecialID 4 is Antique and Artwork Cleaning, SlotID 5 is Sunday. Experienced antique cleaners sit in two towns;
-- traps: an antique cleaner of two years, one available on Sunday only, experienced staff without SpecialID 4.
-- STAFF_SPECIALTY (the mark scheme's spelling) is a view of STAFF_SPECIALITY, so either name runs.
PRAGMA foreign_keys = ON;
CREATE TABLE TOWN (TownID INTEGER PRIMARY KEY, TownName TEXT COLLATE NOCASE);
CREATE TABLE SPECIALITY (SpecialID INTEGER PRIMARY KEY, SpecialDesc TEXT COLLATE NOCASE, SpHourlyRate REAL);
CREATE TABLE STAFF (StaffID INTEGER PRIMARY KEY, StaffTitle TEXT COLLATE NOCASE, StaffFName TEXT COLLATE NOCASE, StaffSName TEXT COLLATE NOCASE, StaffPcode TEXT COLLATE NOCASE, StaffTownID INTEGER REFERENCES TOWN, StaffTel TEXT COLLATE NOCASE, StaffEmail TEXT COLLATE NOCASE, StartDate DATE DEFAULT (date('now')));
CREATE TABLE STAFF_SPECIALITY (StaffID INTEGER REFERENCES STAFF, SpecialID INTEGER REFERENCES SPECIALITY, PRIMARY KEY (StaffID, SpecialID));
CREATE TABLE STAFF_CLIENT_MATCH (StaffID INTEGER REFERENCES STAFF, ClientID INTEGER, PRIMARY KEY (StaffID, ClientID));
CREATE TABLE STAFF_AVAILABILITY (StaffID INTEGER REFERENCES STAFF, SlotID INTEGER, PRIMARY KEY (StaffID, SlotID));
CREATE VIEW STAFF_SPECIALTY AS SELECT StaffID, SpecialID FROM STAFF_SPECIALITY;
INSERT INTO TOWN VALUES (1,'Newry'),(2,'Banbridge'),(3,'Armagh'),(4,'Downpatrick'),(5,'Kilkeel');
INSERT INTO SPECIALITY VALUES (1,'Standard Domestic',14.00),(2,'Basic Sanitisation',16.50),(3,'Hazardous Tasks',24.00),(4,'Antique and Artwork',28.00),(5,'Carpet and Upholstery',18.00);
INSERT INTO STAFF VALUES
 (1,'Ms','Louise','Agnew','BT35 8AA',1,'07700900301','l.agnew@tcs.example',date('now','-3100 days')),
 (2,'Mr','Ciaran','Boyd','BT32 3BB',2,'07700900302','c.boyd@tcs.example',date('now','-2400 days')),
 (3,'Mr','Declan','Downey','BT35 6CC',1,'07700900303','d.downey@tcs.example',date('now','-1500 days')),
 (4,'Mrs','Nuala','Egan','BT61 7DD',3,'07700900304','n.egan@tcs.example',date('now','-2900 days')),
 (5,'Miss','Orla','Farrell','BT30 6EE',4,'07700900305','o.farrell@tcs.example',date('now','-700 days')),
 (6,'Mr','Peter','Gallagher','BT34 4FF',5,'07700900306','p.gallagher@tcs.example',date('now','-2000 days')),
 (7,'Ms','Rachel','Hamill','BT32 4GG',2,'07700900307','r.hamill@tcs.example',date('now','-3600 days')),
 (8,'Mr','Sean','Jennings','BT35 7HH',1,'07700900308','s.jennings@tcs.example',date('now','-2300 days')),
 (9,'Mrs','Tara','Kelly','BT61 8JJ',3,'07700900309','t.kelly@tcs.example',date('now','-400 days')),
 (10,'Ms','Una','Lynch','BT30 7KK',4,'07700900310','u.lynch@tcs.example',date('now','-2600 days'));
INSERT INTO STAFF_SPECIALITY VALUES
 (1,1),(1,4),
 (2,4),(2,5),
 (3,1),(3,2),
 (4,4),
 (5,4),
 (6,3),(6,2),
 (7,4),(7,1),
 (8,4),
 (9,1),
 (10,5),(10,3);
INSERT INTO STAFF_CLIENT_MATCH VALUES (1,501),(2,502),(4,503),(7,504),(8,505),(3,506);
INSERT INTO STAFF_AVAILABILITY VALUES
 (1,1),(1,3),
 (2,2),(2,4),
 (4,1),(4,5),
 (5,1),(5,2),
 (6,2),
 (7,3),(7,4),
 (8,5),
 (9,1),(9,2),
 (10,4);
