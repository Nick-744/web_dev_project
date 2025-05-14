INSERT INTO flight (id, airline_id, airport_depart_id, airport_arrive_id, time_departure, time_arrival, num_tickets) 
VALUES ('IP9026', 'IP', 'KLH', 'FIT', '2025-05-15 10:00', '2025-05-15 13:00', 100);
INSERT INTO ticket (code, flight_id, airline_id, class, price, availability) 
VALUES ('IP9024-E', 'IP9026', 'IP', 'economy', 120.0, 100);
-- INSERT INTO flight (id, airline_id, airport_depart_id, airport_arrive_id, time_departure, time_arrival, num_tickets) 
-- VALUES ('IP9024', 'IP', 'KLH', 'FIT', '2025-05-14 10:00', '2025-05-14 13:00', 100);
-- INSERT INTO ticket (code, flight_id, airline_id, class, price, availability) 
-- VALUES ('IP9024-E', 'IP9024', 'IP', 'economy', 140.0, 100);
