-- seeds/tinies-4.sql — Tinies question set 4 (session bookings and emergency sessions). SQLite dialect. Dates are relative to today.
-- Every BookingDate falls on its slot's day of the week. Today to seven days ahead: emergency bookings at Tinies 1 slots;
-- traps: a non-emergency booking in that week, emergency bookings eight or more days ahead and last week.
-- Emergency revenue at Tinies 2 this calendar month: Monday 08:00 £84 and Wednesday 08:00 £56; traps: Friday 13:00 £30,
-- a Tinies 1 slot with £112, non-emergency bookings on Monday 08:00, and Friday 13:00 emergencies last month.
-- The Tinies 2 09:30 morning slots do not exist yet.
PRAGMA foreign_keys = ON;
CREATE TABLE CRECHE (CrecheID INTEGER PRIMARY KEY, CrecheName TEXT COLLATE NOCASE);
CREATE TABLE CHILD (ChildID TEXT COLLATE NOCASE PRIMARY KEY, ChildFName TEXT COLLATE NOCASE, ChildSName TEXT COLLATE NOCASE, AgeGroup TEXT COLLATE NOCASE, CrecheID INTEGER REFERENCES CRECHE);
CREATE TABLE SESSIONSLOT (SlotID INTEGER PRIMARY KEY AUTOINCREMENT, DayOfWeek TEXT COLLATE NOCASE, StartTime TEXT, EndTime TEXT, CrecheID INTEGER REFERENCES CRECHE);
CREATE TABLE SESSIONBOOKING (BookingID INTEGER PRIMARY KEY AUTOINCREMENT, ChildID TEXT COLLATE NOCASE REFERENCES CHILD, SlotID INTEGER REFERENCES SESSIONSLOT, BookingDate DATE, EmergencyYN TEXT COLLATE NOCASE, AmountPaid REAL);
INSERT INTO CRECHE VALUES (1,'Tinies 1'),(2,'Tinies 2');
INSERT INTO CHILD VALUES
 ('C-031','Ella','Byrne','Toddler',1),
 ('C-032','Cian','Carr','Preschool',1),
 ('C-035','Lily','Hanna','Toddler',1),
 ('C-039','Tadhg','McKevitt','Baby',1),
 ('C-041','Niamh','Murphy','Toddler',1),
 ('C-048','Odhran','Toner','Preschool',1),
 ('C-033','Saoirse','Devlin','Toddler',2),
 ('C-034','Oisin','Fegan','Baby',2),
 ('C-036','Rory','Keenan','Preschool',2),
 ('C-038','Aoibheann','Lennon','Toddler',2),
 ('C-043','Conor','O''Hare','Preschool',2),
 ('C-044','Freya','Quinn','Toddler',2),
 ('C-045','Darragh','O''Neill','Baby',2),
 ('C-047','Eabha','Rice','Toddler',2);
INSERT INTO SESSIONSLOT VALUES
 (1,'Monday','08:00','12:00',1),
 (2,'Tuesday','08:00','12:00',1),
 (3,'Wednesday','08:00','12:00',1),
 (4,'Thursday','13:00','17:00',1),
 (5,'Friday','08:00','12:00',1),
 (6,'Monday','08:00','12:00',2),
 (7,'Wednesday','08:00','12:00',2),
 (8,'Wednesday','13:00','17:00',2),
 (9,'Friday','13:00','17:00',2),
 (10,'Tuesday','13:00','17:00',2);
INSERT INTO SESSIONBOOKING (ChildID, SlotID, BookingDate, EmergencyYN, AmountPaid) VALUES
 ('C-031',1,date('now','weekday 1'),'Y',28.00),
 ('C-035',2,date('now','weekday 2'),'Y',28.00),
 ('C-041',4,date('now','weekday 4'),'Y',30.00),
 ('C-032',5,date('now','weekday 5'),'N',22.00),
 ('C-048',3,date('now','+8 days','weekday 3'),'Y',28.00),
 ('C-039',1,date('now','+8 days','weekday 1'),'Y',28.00),
 ('C-031',2,date('now','-8 days','weekday 2'),'Y',28.00),
 ('C-033',6,date('now','start of month','weekday 1'),'Y',28.00),
 ('C-038',6,date('now','start of month','weekday 1','+7 days'),'Y',28.00),
 ('C-044',6,date('now','start of month','weekday 1','+14 days'),'Y',28.00),
 ('C-036',7,date('now','start of month','weekday 3','+7 days'),'Y',28.00),
 ('C-047',7,date('now','start of month','weekday 3','+21 days'),'Y',28.00),
 ('C-043',9,date('now','start of month','weekday 5','+14 days'),'Y',30.00),
 ('C-034',6,date('now','start of month','weekday 1','+7 days'),'N',22.00),
 ('C-045',6,date('now','start of month','weekday 1','+14 days'),'N',22.00),
 ('C-047',6,date('now','start of month','weekday 1','+21 days'),'N',22.00),
 ('C-038',8,date('now','start of month','weekday 3','+14 days'),'N',22.00),
 ('C-032',2,date('now','start of month','weekday 2','+7 days'),'Y',28.00),
 ('C-041',2,date('now','start of month','weekday 2','+14 days'),'Y',28.00),
 ('C-048',2,date('now','start of month','weekday 2','+21 days'),'Y',28.00),
 ('C-035',3,date('now','start of month','weekday 3','+7 days'),'Y',28.00),
 ('C-043',9,date('now','start of month','-1 month','weekday 5'),'Y',30.00),
 ('C-044',9,date('now','start of month','-1 month','weekday 5','+7 days'),'Y',30.00),
 ('C-036',9,date('now','start of month','-1 month','weekday 5','+14 days'),'Y',30.00);
