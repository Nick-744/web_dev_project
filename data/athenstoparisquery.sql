SELECT 
    f.id AS flight_id,
    a1.city AS departure_city,
    a2.city AS arrival_city,
    f.time_departure,
    f.time_arrival,
    t.class,
    t.price,
    t.availability,
    al.name AS airline_name
FROM flight f
JOIN airport a1 ON f.airport_depart_id = a1.id
JOIN airport a2 ON f.airport_arrive_id = a2.id
JOIN ticket t ON f.id = t.flight_id
JOIN airline al ON f.airline_id = al.id
WHERE a1.city = 'Athens' AND a2.city = 'Paris' AND t.class = 'economy' AND t.availability > 0;
