-- seeds/2015.sql — Deeper Dives (CCEA A2 SSD 2015). SQLite dialect. Dates are relative to today so the practice data never goes stale.
-- Table names and columns are exactly the figure's. Fred Smith is InstructorID 2; InstructorID 6 (Aoife Byrne) exists for the 2015-3 INSERT. No DiveNo 23.
PRAGMA foreign_keys = ON;
CREATE TABLE LOCATION (LocationNo INTEGER PRIMARY KEY, LocationDescription TEXT COLLATE NOCASE);
CREATE TABLE DIVETYPE (DiveTypeNo INTEGER PRIMARY KEY, DiveTypeDescription TEXT COLLATE NOCASE);
CREATE TABLE INSTRUCTOR (InstructorID INTEGER PRIMARY KEY, InstructorSurname TEXT COLLATE NOCASE, InstructorFirstName TEXT COLLATE NOCASE, InstructorTelNo TEXT COLLATE NOCASE);
CREATE TABLE DIVE (DiveNo INTEGER PRIMARY KEY, LocationNo INTEGER REFERENCES LOCATION, DiveTypeNo INTEGER REFERENCES DIVETYPE, DiveDate DATE, Depth INTEGER, InstructorID INTEGER REFERENCES INSTRUCTOR);
CREATE TABLE LOG (ClientID INTEGER, DiveNo INTEGER REFERENCES DIVE, PRIMARY KEY (ClientID, DiveNo));
INSERT INTO LOCATION VALUES (1,'Harbour Wall'),(2,'The Wreck'),(3,'Black Rocks'),(4,'Sea Caves'),(5,'Carlingford');
INSERT INTO DIVETYPE VALUES (1,'Shore Dive'),(2,'Boat Dive'),(3,'Night Dive'),(4,'Wreck Dive'),(5,'Dive with Compass'),(6,'Deep Dive');
INSERT INTO INSTRUCTOR VALUES
 (1,'Jones','Fred','028 3026 1101'),
 (2,'Smith','Fred','028 3026 1102'),
 (3,'Smith','Mary','028 3026 1103'),
 (4,'Doherty','Ciara','028 3026 1104'),
 (5,'McKenna','Liam','028 3026 1105'),
 (6,'Byrne','Aoife','028 3026 1106');
-- Fred Smith (2) has five dives; Fred Jones (1) and Mary Smith (3) have dives too, so a WHERE on one name only shows the wrong rows.
INSERT INTO DIVE VALUES
 (1,1,1,date('now','-95 days'),12,2),
 (2,2,4,date('now','-88 days'),28,1),
 (3,3,5,date('now','-81 days'),18,3),
 (4,1,2,date('now','-74 days'),22,4),
 (5,4,3,date('now','-70 days'),15,2),
 (6,2,4,date('now','-63 days'),30,5),
 (7,3,1,date('now','-60 days'),10,1),
 (8,5,6,date('now','-52 days'),38,2),
 (9,1,1,date('now','-45 days'),11,3),
 (10,4,2,date('now','-40 days'),20,6),
 (11,2,4,date('now','-33 days'),29,2),
 (12,3,5,date('now','-27 days'),17,4),
 (13,5,3,date('now','-21 days'),16,1),
 (14,1,2,date('now','-14 days'),21,3),
 (15,4,5,date('now','-9 days'),19,2),
 (16,2,6,date('now','-6 days'),35,5),
 (17,3,1,date('now','-2 days'),12,6),
 (18,5,2,date('now','+5 days'),24,4);
INSERT INTO LOG VALUES (101,1),(102,1),(103,2),(101,3),(104,5),(105,5),(102,8),(106,11),(101,15),(107,16),(108,17);
