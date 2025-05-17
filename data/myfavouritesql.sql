-- First, get the outbound price for the specific departure date
WITH outbound AS (
    SELECT MIN(t_out.price) AS min_out_price
    FROM flight f
    JOIN airport a1 ON f.airport_depart_id = a1.id
    JOIN airport a2 ON f.airport_arrive_id = a2.id
    JOIN ticket t_out ON f.id = t_out.flight_id
    WHERE lower(a1.city) = 'athens'
      AND lower(a2.city) = 'london'
      AND DATE(f.time_departure) = '2025-05-30'
)
SELECT 
    DATE(r.time_departure) AS retDate,
    (outbound.min_out_price + MIN(t_ret.price)) AS totalPrice
FROM flight r
JOIN airport a2 ON r.airport_depart_id = a2.id
JOIN airport a1 ON r.airport_arrive_id = a1.id
JOIN ticket t_ret ON r.id = t_ret.flight_id,
     outbound
WHERE lower(a2.city) = 'london'
  AND lower(a1.city) = 'athens'
  AND DATE(r.time_departure) >= '2025-05-30'
GROUP BY retDate
ORDER BY retDate ASC;

