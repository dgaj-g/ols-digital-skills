-- seeds/2021.sql — Shepherds Veterinary (CCEA A2 SSD 2021). SQLite dialect. Dates are relative to today.
-- Duration is in hours (the 2021 mark scheme sums it against 150 hours).
-- 2021-b: tomorrow has five surgery appointments across three vets, plus a farm visit (trap) and appointments today (trap).
-- 2021-c: last calendar month, vet 1 (Kerr) has 165 hours of surgery appointments; vet 2 (Moore) has 135 (under 150);
-- vet 3 (Grant) has 180 hours of FARM visits, which the question leaves out. The bulk rows are generated below the hand rows.
PRAGMA foreign_keys = ON;
CREATE TABLE CLIENT (ClientID INTEGER PRIMARY KEY, ClientForename TEXT COLLATE NOCASE, ClientSurname TEXT COLLATE NOCASE, ClientAddress1 TEXT COLLATE NOCASE, ClientAddress2 TEXT COLLATE NOCASE, ClientAddress3 TEXT COLLATE NOCASE, ClientPostcode TEXT COLLATE NOCASE, ClientTelNo TEXT COLLATE NOCASE);
CREATE TABLE BREED (BreedID INTEGER PRIMARY KEY, BreedDesc TEXT COLLATE NOCASE);
CREATE TABLE ANIMAL (AnimalID INTEGER PRIMARY KEY, AnimalName TEXT COLLATE NOCASE, AnimalDOB DATE, ClientID INTEGER REFERENCES CLIENT, BreedID INTEGER REFERENCES BREED);
CREATE TABLE VET (VetID INTEGER PRIMARY KEY, VetForename TEXT COLLATE NOCASE, VetSurname TEXT COLLATE NOCASE);
CREATE TABLE APPOINTMENT (AppID INTEGER PRIMARY KEY, AppDate DATE, AppTime TEXT COLLATE NOCASE, ClientID INTEGER REFERENCES CLIENT, VetID INTEGER REFERENCES VET, FarmVisitYN TEXT COLLATE NOCASE, Duration REAL, NoOfAnimals INTEGER);
CREATE TABLE APPANIMAL (AppID INTEGER REFERENCES APPOINTMENT, AnimalID INTEGER REFERENCES ANIMAL, PRIMARY KEY (AppID, AnimalID));
INSERT INTO CLIENT VALUES
 (1,'Anne','McGuigan','12 Canal Street','Newry','Co Down','BT35 6JA','028 3026 5501'),
 (2,'Brian','Lennon','Drumalane Farm','Mayobridge','Co Down','BT34 2HT','028 3085 5502'),
 (3,'Caroline','Rice','4 Parkhead Road','Warrenpoint','Co Down','BT34 3LQ','028 4175 5503'),
 (4,'Donal','Sweeney','77 Armagh Road','Newry','Co Down','BT35 6PN','028 3026 5504'),
 (5,'Elaine','Grant','Tullyhappy Farm','Poyntzpass','Co Armagh','BT35 6RE','028 3831 5505'),
 (6,'Frank','Owens','9 Glen Road','Rostrevor','Co Down','BT34 3BZ','028 4173 5506'),
 (7,'Geraldine','Kelly','31 Chapel Street','Bessbrook','Co Armagh','BT35 7AB','028 3083 5507'),
 (8,'Hugh','Murray','Carrickcruppen Farm','Camlough','Co Armagh','BT35 7JN','028 3083 5508'),
 (9,'Isobel','Nugent','2 Station Road','Jonesborough','Co Armagh','BT35 8HY','028 3084 5509'),
 (10,'James','Crilly','56 High Street','Newry','Co Down','BT34 1HB','028 3026 5510');
INSERT INTO BREED VALUES (1,'Labrador'),(2,'Border Collie'),(3,'Domestic Shorthair'),(4,'Holstein Friesian'),(5,'Suffolk Sheep'),(6,'Cocker Spaniel'),(7,'Rabbit'),(8,'Connemara Pony');
INSERT INTO ANIMAL VALUES
 (1,'Bran',date('now','-2200 days'),1,1),
 (2,'Meg',date('now','-1500 days'),2,2),
 (3,'Tigger',date('now','-3000 days'),3,3),
 (4,'Daisy',date('now','-900 days'),5,4),
 (5,'Shadow',date('now','-700 days'),4,6),
 (6,'Flopsy',date('now','-400 days'),6,7),
 (7,'Misty',date('now','-4000 days'),8,8),
 (8,'Rex',date('now','-1200 days'),7,1),
 (9,'Luna',date('now','-600 days'),9,3),
 (10,'Nell',date('now','-2600 days'),10,2),
 (11,'Bella',date('now','-1100 days'),2,5),
 (12,'Pip',date('now','-300 days'),3,7);
INSERT INTO VET VALUES (1,'Shauna','Kerr'),(2,'Owen','Moore'),(3,'Mark','Grant'),(4,'Aoife','Byrne');
INSERT INTO APPOINTMENT VALUES
 (1,date('now','+1 day'),'09:00',1,1,'N',0.5,1),
 (2,date('now','+1 day'),'09:30',3,1,'N',0.75,2),
 (3,date('now','+1 day'),'11:00',6,2,'N',0.5,1),
 (4,date('now','+1 day'),'10:15',7,2,'N',0.5,1),
 (5,date('now','+1 day'),'14:00',9,4,'N',1.0,1),
 (6,date('now','+1 day'),'10:00',2,3,'Y',3.0,12),
 (7,date('now'),'09:00',4,1,'N',0.5,1),
 (8,date('now'),'15:30',10,4,'N',0.5,1),
 (9,date('now','+2 days'),'11:30',1,2,'N',0.5,1),
 (10,date('now','+3 days'),'09:00',8,3,'Y',2.0,1),
 (11,date('now','-2 days'),'16:00',3,4,'N',0.75,1),
 (12,date('now','-6 days'),'12:00',5,3,'Y',4.0,30);
INSERT INTO APPANIMAL VALUES (1,1),(2,3),(2,12),(3,6),(4,8),(5,9),(6,2),(6,11),(7,5),(8,10),(9,1),(10,7),(11,3),(12,4);
-- Last calendar month, generated: vet 1 220 × 0.75 h = 165 h; vet 2 180 × 0.75 h = 135 h; vet 3 60 farm visits × 3 h = 180 h.
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i<460)
INSERT INTO APPOINTMENT SELECT 1000+i, date('now','start of month','-1 month', ((i*7)%28)||' days'),
 printf('%02d:%02d', 9+(i%8), (i%4)*15), (i%10)+1,
 CASE WHEN i<=220 THEN 1 WHEN i<=400 THEN 2 ELSE 3 END,
 CASE WHEN i<=400 THEN 'N' ELSE 'Y' END,
 CASE WHEN i<=400 THEN 0.75 ELSE 3.0 END, 1 FROM n;
