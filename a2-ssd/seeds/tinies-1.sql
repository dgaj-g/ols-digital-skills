-- seeds/tinies-1.sql — Tinies question set 1 (children, parents, key workers). SQLite dialect. Dates are relative to today.
-- Toddlers at Tinies 2: four children (the list the set's SELECT asks for); traps: toddlers at Tinies 1, babies at Tinies 2.
-- C-041 is at Tinies 1 with key worker S-013; S-022 has just joined Tinies 1. Parent P-012 and staff S-015 exist; C-051 does not yet.
PRAGMA foreign_keys = ON;
CREATE TABLE PARENT (ParentID TEXT COLLATE NOCASE PRIMARY KEY, ParentFName TEXT COLLATE NOCASE, ParentSName TEXT COLLATE NOCASE, ParentAdd1 TEXT COLLATE NOCASE, ParentAdd2 TEXT COLLATE NOCASE, ParentPostCode TEXT COLLATE NOCASE, ParentTel TEXT COLLATE NOCASE);
CREATE TABLE CRECHE (CrecheID INTEGER PRIMARY KEY, CrecheName TEXT COLLATE NOCASE, CrecheLocation TEXT COLLATE NOCASE);
CREATE TABLE STAFF (StaffID TEXT COLLATE NOCASE PRIMARY KEY, StaffFName TEXT COLLATE NOCASE, StaffSName TEXT COLLATE NOCASE, StaffEmail TEXT COLLATE NOCASE, QualLevel INTEGER, CrecheID INTEGER REFERENCES CRECHE);
CREATE TABLE CHILD (ChildID TEXT COLLATE NOCASE PRIMARY KEY, ChildFName TEXT COLLATE NOCASE, ChildSName TEXT COLLATE NOCASE, ChildDOB DATE, AgeGroup TEXT COLLATE NOCASE, ParentID TEXT COLLATE NOCASE REFERENCES PARENT, KeyStaffID TEXT COLLATE NOCASE REFERENCES STAFF, CrecheID INTEGER REFERENCES CRECHE);
INSERT INTO PARENT VALUES
 ('P-001','Siobhan','Byrne','12 Canal Street','Newry','BT35 6JB','07700 900401'),
 ('P-002','Martin','Carr','4 Rock Road','Warrenpoint','BT34 3LT','07700 900402'),
 ('P-003','Ciara','Devlin','27 High Street','Newry','BT34 1HB','07700 900403'),
 ('P-004','Stephen','Fegan','9 Chapel Road','Bessbrook','BT35 7DS','07700 900404'),
 ('P-005','Deirdre','Hanna','33 Drumalane Road','Newry','BT35 8QA','07700 900405'),
 ('P-006','Gavin','Keenan','6 Bridge Street','Kilkeel','BT34 4AH','07700 900406'),
 ('P-007','Orla','Lennon','18 Armagh Road','Newry','BT35 6PN','07700 900407'),
 ('P-008','Eamon','McKevitt','2 Mourne View','Mayobridge','BT34 2HN','07700 900408'),
 ('P-009','Nicola','Murphy','41 Patrick Street','Newry','BT35 8EA','07700 900409'),
 ('P-010','Declan','O''Hare','7 Church Street','Rostrevor','BT34 3BA','07700 900410'),
 ('P-011','Leanne','Quinn','15 Dublin Road','Newry','BT35 8DA','07700 900411'),
 ('P-012','Brian','O''Neill','22 Forkhill Road','Newry','BT35 8LY','07700 900412'),
 ('P-013','Maeve','Rice','3 Greenbank','Newry','BT34 2QX','07700 900413'),
 ('P-014','Paul','Toner','10 Newtown Road','Camlough','BT35 7JJ','07700 900414');
INSERT INTO CRECHE VALUES (1,'Tinies 1','Monaghan Street, Newry'),(2,'Tinies 2','Rathfriland Road, Newry');
INSERT INTO STAFF VALUES
 ('S-011','Aine','Corr','a.corr@tinies.example',5,1),
 ('S-012','Bronagh','Doyle','b.doyle@tinies.example',3,1),
 ('S-013','Catriona','Gilmore','c.gilmore@tinies.example',3,1),
 ('S-014','Donna','Hughes','d.hughes@tinies.example',6,2),
 ('S-015','Emer','Kearney','e.kearney@tinies.example',3,2),
 ('S-016','Fionnuala','Magee','f.magee@tinies.example',2,2),
 ('S-017','Grainne','Nugent','g.nugent@tinies.example',3,2),
 ('S-018','Helen','Owens','h.owens@tinies.example',2,1),
 ('S-020','Joanne','Price','j.price@tinies.example',5,2),
 ('S-022','Karen','Rafferty','k.rafferty@tinies.example',3,1);
INSERT INTO CHILD VALUES
 ('C-031','Ella','Byrne',date('now','-700 days'),'Toddler','P-001','S-012',1),
 ('C-032','Cian','Carr',date('now','-1200 days'),'Preschool','P-002','S-011',1),
 ('C-033','Saoirse','Devlin',date('now','-640 days'),'Toddler','P-003','S-015',2),
 ('C-034','Oisin','Fegan',date('now','-250 days'),'Baby','P-004','S-016',2),
 ('C-035','Lily','Hanna',date('now','-900 days'),'Toddler','P-005','S-018',1),
 ('C-036','Rory','Keenan',date('now','-1300 days'),'Preschool','P-006','S-014',2),
 ('C-038','Aoibheann','Lennon',date('now','-560 days'),'Toddler','P-007','S-017',2),
 ('C-039','Tadhg','McKevitt',date('now','-180 days'),'Baby','P-008','S-012',1),
 ('C-041','Niamh','Murphy',date('now','-820 days'),'Toddler','P-009','S-013',1),
 ('C-043','Conor','O''Hare',date('now','-1150 days'),'Preschool','P-010','S-020',2),
 ('C-044','Freya','Quinn',date('now','-760 days'),'Toddler','P-011','S-015',2),
 ('C-045','Darragh','O''Neill',date('now','-300 days'),'Baby','P-012','S-015',2),
 ('C-047','Eabha','Rice',date('now','-610 days'),'Toddler','P-013','S-017',2),
 ('C-048','Odhran','Toner',date('now','-1000 days'),'Preschool','P-014','S-011',1);
