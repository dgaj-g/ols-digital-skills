-- seeds/2017.sql — The Haven (CCEA A2 SSD 2017). SQLite dialect.
-- The paper has no GETDATE question and fixes its own dates (booking B101 on 1 May 2017), so the bookings sit in 2017.
-- Guest 1004 and family room 6 exist for the 2017-1 INSERT; B101 does not. B102 exists for the 2017-2 UPDATE.
-- B103 (Ciara McAleer) books two rooms, so the 2017-3 list has two rows.
PRAGMA foreign_keys = ON;
CREATE TABLE GUEST (GuestNo TEXT COLLATE NOCASE PRIMARY KEY, Surname TEXT COLLATE NOCASE, FirstName TEXT COLLATE NOCASE);
CREATE TABLE ROOMTYPE (TypeNo INTEGER PRIMARY KEY, RoomDescription TEXT COLLATE NOCASE, MaxNoRoom INTEGER);
CREATE TABLE ROOM (RoomNo INTEGER PRIMARY KEY, TypeNo INTEGER REFERENCES ROOMTYPE);
CREATE TABLE BOOKING (BookingNo TEXT COLLATE NOCASE PRIMARY KEY, BookingDate DATE, CheckInDate DATE, NoOfNights INTEGER, BookingStatus TEXT COLLATE NOCASE DEFAULT 'Confirmed', NoOfAdults INTEGER, NoOfChildren INTEGER, GuestNo TEXT COLLATE NOCASE REFERENCES GUEST);
CREATE TABLE BOOKINGDETAILS (BookingNo TEXT COLLATE NOCASE REFERENCES BOOKING, RoomNo INTEGER REFERENCES ROOM, PRIMARY KEY (BookingNo, RoomNo));
INSERT INTO GUEST VALUES
 ('1001','Hughes','Brendan'),
 ('1002','Kearney','Siobhan'),
 ('1003','Walsh','Declan'),
 ('1004','Magee','Orla'),
 ('1005','Doyle','Patrick'),
 ('1006','Cassidy','Roisin'),
 ('1007','McAleer','Ciara'),
 ('1008','Rafferty','Tom'),
 ('1009','Devlin','Grainne'),
 ('1010','Burns','Eoin');
INSERT INTO ROOMTYPE VALUES (1,'Single',1),(2,'Double',2),(3,'Twin',2),(4,'Family',4);
INSERT INTO ROOM VALUES (1,1),(2,1),(3,2),(4,2),(5,3),(6,4),(7,4),(8,2),(9,3),(10,4),(11,1),(12,2);
INSERT INTO BOOKING VALUES
 ('B090','2017-01-04','2017-02-10',2,'Completed',2,0,'1001'),
 ('B091','2017-01-12','2017-03-17',3,'Completed',2,2,'1002'),
 ('B092','2017-01-20','2017-02-24',1,'Completed',1,0,'1003'),
 ('B093','2017-02-02','2017-04-14',4,'Confirmed',2,3,'1004'),
 ('B094','2017-02-08','2017-04-21',2,'Confirmed',2,0,'1005'),
 ('B095','2017-02-15','2017-05-05',7,'Confirmed',2,2,'1006'),
 ('B096','2017-02-21','2017-03-03',1,'Cancelled',1,0,'1008'),
 ('B097','2017-03-01','2017-07-14',5,'Confirmed',2,1,'1009'),
 ('B098','2017-03-09','2017-06-02',3,'Confirmed',2,0,'1010'),
 ('B099','2017-03-16','2017-08-04',6,'Confirmed',2,2,'1001'),
 ('B100','2017-03-28','2017-04-28',2,'Confirmed',1,0,'1003'),
 ('B102','2017-04-03','2017-05-26',3,'Confirmed',2,0,'1005'),
 ('B103','2017-02-10','2017-05-19',4,'Confirmed',3,2,'1007'),
 ('B104','2017-04-11','2017-09-01',7,'Confirmed',2,2,'1002');
INSERT INTO BOOKINGDETAILS VALUES
 ('B090',3),('B091',6),('B092',1),('B093',7),('B094',4),('B095',10),('B096',2),('B097',6),
 ('B098',8),('B099',7),('B100',11),('B102',12),('B103',3),('B103',10),('B104',6);
