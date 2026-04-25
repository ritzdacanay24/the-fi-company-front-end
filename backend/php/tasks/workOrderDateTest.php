
<?php

use EyefiDb\Databases\DatabaseQad;

$db_connect_qad = new DatabaseQad();
$db = $db_connect_qad->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

//OP10 to -3 due date, OP20 to -2 due date, OP30 -1 
//OP10 to -2 due date, OP20 to -1 due date, OP30 0 

$mainQry = "
select wr_nbr wr_nbr 
, a.wr_op 
            , a.wr_qty_ord - a.wr_qty_comp openQty
            , dueBy dueBy
            , DUE_BY_TEST
            , a.wr_part wr_part
            , wr_due
            , DAYNAME(wr_due) wr_due_test
            , DAYOFWEEK(wr_due) DAYOFWEEK
        from 
            ( select a.wr_nbr, 
            a.wr_op, 
            a.wr_qty_ord, 
            a.wr_qty_wip,  
            a.wr_qty_comp, 
            a.wr_status, 
            a.wr_due, 
            a.wr_part, 
            a.wr_queue, 
            a.wr_qty_inque,
            CASE  
                WHEN b.wo_so_job = 'dropin' 
                    THEN wr_due
                ELSE 
                    CASE 
                        WHEN a.wr_op = 10
                            THEN 
                                CASE 
                                    WHEN DAYOFWEEK ( wr_due ) IN (1)
                                        THEN wr_due - 6
                                        WHEN DAYOFWEEK ( wr_due ) IN (2)
                                            THEN wr_due - 7
                                            WHEN DAYOFWEEK ( wr_due ) IN (3)
                                                THEN wr_due - 7
                                                WHEN DAYOFWEEK ( wr_due ) IN (4)
                                                    THEN wr_due - 7
                                                    WHEN DAYOFWEEK ( wr_due ) IN (5)
                                                        THEN wr_due - 7
                                                        WHEN DAYOFWEEK ( wr_due ) IN (6)
                                                            THEN wr_due - 8
                                                            WHEN DAYOFWEEK ( wr_due ) IN (7)
                                                                THEN wr_due - 5
                                    ELSE wr_due - 5
                        END 
                        WHEN a.wr_op = 20
                            THEN 
                            CASE 
                                    WHEN DAYOFWEEK ( wr_due ) IN (1)
                                        THEN wr_due - 4
                                        WHEN DAYOFWEEK ( wr_due ) IN (2)
                                            THEN wr_due - 5
                                            WHEN DAYOFWEEK ( wr_due ) IN (3)
                                                THEN wr_due - 5
                                                WHEN DAYOFWEEK ( wr_due ) IN (4)
                                                    THEN wr_due - 5
                                                    WHEN DAYOFWEEK ( wr_due ) IN (5)
                                                        THEN wr_due - 3
                                                        WHEN DAYOFWEEK ( wr_due ) IN (6)
                                                            THEN wr_due - 3
                                                            WHEN DAYOFWEEK ( wr_due ) IN (7)
                                                                THEN wr_due - 3
                                    ELSE wr_due - 3
                            END 
                        WHEN a.wr_op = 30
                            THEN 
                            CASE 
                            WHEN DAYOFWEEK ( wr_due ) IN (1)
                                THEN wr_due - 2
                                WHEN DAYOFWEEK ( wr_due ) IN (2, 3)
                                    THEN wr_due - 4
                                WHEN DAYOFWEEK ( wr_due ) IN (4)
                                    THEN wr_due - 2
                                ELSE wr_due - 2
                            END 			
                    END 
            END dueBy ,
            CASE  
                WHEN b.wo_so_job = 'dropin' 
                    THEN wr_due
                ELSE 
                    CASE 
                        WHEN a.wr_op = 10
                            THEN 
                                CASE 
                                    WHEN DAYOFWEEK ( wr_due ) IN (1)
                                        THEN wr_due - 4
                                        WHEN DAYOFWEEK ( wr_due ) IN (2)
                                            THEN wr_due - 4
                                            WHEN DAYOFWEEK ( wr_due ) IN (3)
                                                THEN wr_due - 4
                                                WHEN DAYOFWEEK ( wr_due ) IN (4)
                                                    THEN wr_due - 2
                                                    WHEN DAYOFWEEK ( wr_due ) IN (5)
                                                        THEN wr_due - 2
                                                        WHEN DAYOFWEEK ( wr_due ) IN (6)
                                                            THEN wr_due - 2
                                                            WHEN DAYOFWEEK ( wr_due ) IN (7)
                                                                THEN wr_due - 3
                                    ELSE wr_due - 2
                        END 
                        WHEN a.wr_op = 20
                            THEN 
                            CASE 
                                    WHEN DAYOFWEEK ( wr_due ) IN (1)
                                        THEN wr_due - 3
                                        WHEN DAYOFWEEK ( wr_due ) IN (2)
                                            THEN wr_due - 3
                                            WHEN DAYOFWEEK ( wr_due ) IN (3)
                                                THEN wr_due - 1
                                                WHEN DAYOFWEEK ( wr_due ) IN (4)
                                                    THEN wr_due - 1
                                                    WHEN DAYOFWEEK ( wr_due ) IN (5)
                                                        THEN wr_due - 1
                                                        WHEN DAYOFWEEK ( wr_due ) IN (6)
                                                            THEN wr_due - 1
                                                            WHEN DAYOFWEEK ( wr_due ) IN (7)
                                                                THEN wr_due - 2
                                    ELSE wr_due - 1
                            END 
                        WHEN a.wr_op = 30
                            THEN 
                            CASE 
                            WHEN DAYOFWEEK ( wr_due ) IN (1)
                                THEN wr_due - 2
                                WHEN DAYOFWEEK ( wr_due ) IN (2, 3)
                                    THEN wr_due - 0
                                WHEN DAYOFWEEK ( wr_due ) IN (4)
                                    THEN wr_due - 0
                                ELSE wr_due - 0
                            END 			
                    END 
            END DUE_BY_TEST
            from wr_route a 
            join ( 
                select wo_nbr, wo_so_job
                from wo_mstr 
                where wo_domain = 'EYE' 
                    and wo_status != 'c' 
            ) b ON b.wo_nbr = a.wr_nbr 
            where a.wr_qty_ord != a.wr_qty_comp 
                and a.wr_domain = 'EYE'
            ) a
";

$query = $db->prepare($mainQry);
$query->execute();
$result = $query->fetchAll(PDO::FETCH_ASSOC);


echo $db_connect_qad->jsonToTableNice($result);

?>
