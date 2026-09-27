-- seeds/2018.sql — Connected Works (CCEA A2 SSD 2018). SQLite dialect. Dates are relative to today.
-- CUSTOMER and FEE are the paper's assumed tables (CUSTOMER with the fields the mark scheme names).
-- 2018-b-i: some jobs never carried out (NULL), weekly jobs, monthly jobs last done 23+ days ago; traps: a monthly job done
-- 10 days ago, quarterly and yearly jobs. 2018-c: three contracts start in the future (two on fee 2, one on fee 3).
PRAGMA foreign_keys = ON;
CREATE TABLE CUSTOMER (CustomerNo INTEGER PRIMARY KEY, CustomerForename TEXT COLLATE NOCASE, CustomerSurname TEXT COLLATE NOCASE, CustomerAddress1 TEXT COLLATE NOCASE, CustomerAddress2 TEXT COLLATE NOCASE);
CREATE TABLE FEE (FeeNo INTEGER PRIMARY KEY, FeeDescription TEXT COLLATE NOCASE);
CREATE TABLE SKILL (SkillNo INTEGER PRIMARY KEY, Skill TEXT COLLATE NOCASE, Cost_hr REAL);
CREATE TABLE JOB (JobNo INTEGER PRIMARY KEY, JobType TEXT COLLATE NOCASE, SkillNo INTEGER REFERENCES SKILL);
CREATE TABLE STAFF (StaffNo INTEGER PRIMARY KEY, StaffSurname TEXT COLLATE NOCASE, StaffForename TEXT COLLATE NOCASE, Salary REAL, SkillNo INTEGER REFERENCES SKILL);
CREATE TABLE CONTRACT (ContractNo INTEGER PRIMARY KEY, StartDate DATE, EndDate DATE, CustomerNo INTEGER REFERENCES CUSTOMER, FeeNo INTEGER REFERENCES FEE);
CREATE TABLE CONTRACTJOB (ContractNo INTEGER REFERENCES CONTRACT, JobNo INTEGER REFERENCES JOB, Frequency TEXT COLLATE NOCASE, DateLastCarriedOut DATE, PRIMARY KEY (ContractNo, JobNo));
INSERT INTO CUSTOMER VALUES
 (1,'Aidan','Quinn','14 Main Street','Newry'),
 (2,'Bernadette','Fox','3 Abbey Road','Warrenpoint'),
 (3,'Colm','Toner','27 Hill Street','Newry'),
 (4,'Deirdre','Lavery','8 Church Lane','Rostrevor'),
 (5,'Eamon','Mallon','51 Dublin Road','Banbridge'),
 (6,'Fiona','Hanna','2 Mill Close','Kilkeel'),
 (7,'Gerard','Mulholland','19 Quay Street','Newry'),
 (8,'Helen','Carr','6 Rathfriland Road','Hilltown');
INSERT INTO FEE VALUES (1,'Weekly'),(2,'Monthly'),(3,'Quarterly'),(4,'Annual');
INSERT INTO SKILL VALUES (1,'Cleaning',14.50),(2,'Gardening',16.00),(3,'Plumbing',32.00),(4,'Electrical',35.00),(5,'Painting',22.00);
INSERT INTO JOB VALUES
 (1,'Window cleaning',1),(2,'Office cleaning',1),(3,'Lawn mowing',2),(4,'Hedge cutting',2),(5,'Boiler service',3),
 (6,'Gutter clearing',1),(7,'Alarm check',4),(8,'Pressure washing',1),(9,'Fence painting',5),(10,'Lighting check',4);
INSERT INTO STAFF VALUES
 (1,'Rooney','Stephen',38000.00,3),
 (2,'Morgan','Kate',21500.00,1),
 (3,'Boyle','Niall',22000.00,2),
 (4,'Keenan','Maeve',34500.00,4),
 (5,'Donnelly','Ryan',20500.00,1),
 (6,'Sloan','Aisling',24000.00,5),
 (7,'McCann','Liam',23000.00,2),
 (8,'Tumelty','Clare',33000.00,3);
INSERT INTO CONTRACT VALUES
 (101,date('now','-400 days'),date('now','+330 days'),1,2),
 (102,date('now','-220 days'),date('now','+145 days'),2,1),
 (103,date('now','-90 days'),date('now','+275 days'),3,2),
 (104,date('now','-30 days'),date('now','+700 days'),4,3),
 (105,date('now','-500 days'),date('now','+230 days'),5,4),
 (106,date('now','-10 days'),date('now','+355 days'),6,2),
 (107,date('now','+14 days'),date('now','+379 days'),7,2),
 (108,date('now','+30 days'),date('now','+760 days'),8,3),
 (109,date('now','+45 days'),date('now','+410 days'),1,2),
 (110,date('now','-700 days'),date('now','-5 days'),2,4);
INSERT INTO CONTRACTJOB VALUES
 (101,1,'M',date('now','-26 days')),
 (101,3,'W',date('now','-6 days')),
 (102,2,'W',date('now','-3 days')),
 (102,6,'Q',date('now','-40 days')),
 (103,1,'M',date('now','-10 days')),
 (103,4,'M',date('now','-31 days')),
 (104,5,'Y',date('now','-200 days')),
 (104,7,'M',NULL),
 (105,8,'Q',date('now','-100 days')),
 (105,9,'Y',NULL),
 (106,2,'W',date('now','-7 days')),
 (106,10,'M',date('now','-23 days')),
 (107,3,'W',NULL),
 (108,5,'Y',NULL),
 (109,1,'M',NULL),
 (110,6,'Q',date('now','-95 days'));
