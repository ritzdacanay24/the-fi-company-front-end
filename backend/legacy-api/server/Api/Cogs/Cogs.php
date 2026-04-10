<?php
namespace EyefiDb\Api\Cogs;

use PDO;
use PDOException;

class Cogs
{

    protected $db;

    public function __construct($db)
    {

        $this->db = $db;
    }

    public function read_by_date($dateFrom, $dateTo)
    {

        $qry = "
                select c.DInvoiceDIText
                    , c.DInvoice_ID
                    , c.DInvoiceVoucher
                    , idh_part itemNumber
                    , idh_inv_nbr
                    , listPrice
                    , COALESCE(qtyInv,0) quantityInvoiced
                    , pt_desc1
                    , COALESCE(sct_cst_tot,0) productCost
                    , idh_acct 
                    , CASE 
                        WHEN idh_acct = 47000 
                            THEN 'Product' 
                        WHEN idh_acct = 47900 
                            THEN 'Service/Parts' 
                        WHEN idh_acct = 47950 
                            THEN 'Service/Storage' 
                        WHEN idh_acct = 47960 
                            THEN 'Kitting'  
                        WHEN idh_acct = 47500 
                            THEN 'Graphics' 
                    END idh_acct_text
                    , COALESCE(listPrice * qtyInv,0)  total
                    , sum(PostingLineDebitLC) PostingLineDebitLC
                    , sum(PostingLineCreditLC) PostingLineCreditLC
                    , sum(PostingLineDebitLC) - sum(PostingLineCreditLC) totalTest
                    
                    , COALESCE(round(( sct_cst_tot /  NULLIF(listPrice, 0) ) * 100, 2),0) costPercent
                    
                    , COALESCE(( listPrice * qtyInv ),0) * COALESCE(( sct_cst_tot /  NULLIF(listPrice, 0) ),0)  blendedTotal
                    , CASE 
                        WHEN qtyInv > 0 
                            THEN listPrice * qtyInv 
                        ELSE 0 
                    END credit 
                    , CASE 
                        WHEN qtyInv < 0 
                            THEN ABS(listPrice * qtyInv) 
                        ELSE 0 
                    END debit 
                    , CASE 
                        WHEN idh_part LIKE '%EYE%' 
                            THEN 1 
                        ELSE 0 
                    END eyePart 
                    , max(d.so_cust)  so_cust
                    , max(d.so_nbr)  so_nbr
                from PostingLine a
                
                left join (
                    select a.Posting_ID
                        , a.DInvoice_ID
                    from DInvoicePosting a
                ) b ON b.Posting_ID = a.Posting_ID
                
                left join (
                    select a.DInvoice_ID
                        , a.DInvoiceDIText
                        , DInvoiceVoucher
                    from DInvoice a
                ) c ON c.DInvoice_ID = b.DInvoice_ID
                
                left JOIN (
                    select a.idh_part
                        , a.idh_inv_nbr
                        , a.idh_list_pr listPrice
                        , sum(a.idh_qty_inv) qtyInv
                        , pt_desc1
                        , idh_acct
                        , max(sct_cst_tot) sct_cst_tot
                        , max(so_cust) so_cust
                        , max(so_nbr) so_nbr
                    from idh_hist a
                    LEFT JOIN (
                        select so_cust, so_nbr
                        from so_mstr
                    ) so ON so.so_nbr = a.idh_nbr
                        LEFT JOIN (
                        select a.pt_part
                            , max(a.pt_desc1) pt_desc1
                            , max(sct_cst_tot) sct_cst_tot
                        from pt_mstr a
                        left join ( 
                            select sct_part
                                , max(sct_cst_tot) sct_cst_tot
                            from sct_det
                            where sct_sim = 'Standard'
                                AND sct_domain = 'EYE'
                                and sct_site  = 'EYE01'
                            group by sct_part
                        ) c ON a.pt_part = c.sct_part
                        
                        where a.pt_domain = 'EYE'
                        group by a.pt_part
                    ) d ON a.idh_part = d.pt_part
                    where a.idh_domain = 'EYE'
                    and IDH_ACCT IN (47000, 47900, 47950, 47960, 47500)
                    group by a.idh_part
                        , a.idh_inv_nbr
                        , a.idh_list_pr
                        , pt_desc1
                        , idh_acct
                ) d  ON d.idh_inv_nbr = c.DInvoiceDIText
                where a.GL_ID IN (15774615, 15774616, 15790482, 15790530, 15774617, 15774618, 27413065)
                    and a.PostingDate between  :dateFrom and :dateTo
                    and idh_part IS NOT NULL
                    
                group by c.DInvoiceDIText
                    , c.DInvoice_ID
                    , c.DInvoiceVoucher
                    , idh_part
                    , idh_inv_nbr
                    , listPrice
                    , qtyInv
                    , pt_desc1
                    , idh_acct
                    , sct_cst_tot
                order by listPrice * qtyInv desc
                WITH (nolock)
            ";

        $query = $this->db->prepare($qry);
        $query->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
        $query->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);

        $qry = "
                select IFNULL(sum(case when a.GL_ID = 15774615 then  a.PostingLineCreditLC - a.PostingLineDebitLC else 0 end),0) Product
                    , sum(case when a.GL_ID IN (15774616, 15790482, 15790530) then a.PostingLineCreditLC - a.PostingLineDebitLC else 0 end) ServiceParts
                    , sum(case when a.GL_ID = 15774617 then a.PostingLineCreditLC - a.PostingLineDebitLC else 0 end) ServiceStorage
                    , sum(case when a.GL_ID = 15774618 then a.PostingLineCreditLC - a.PostingLineDebitLC else 0 end) Kitting
                    , sum(case when a.GL_ID = 27413065 then a.PostingLineCreditLC - a.PostingLineDebitLC else 0 end) Graphics
                    , sum(a.PostingLineCreditLC) - sum(a.PostingLineDebitLC) total
                from PostingLine a
                
                left join (
                    select Posting_ID
                        , DInvoice_ID
                    from DInvoicePosting 
                ) b ON b.Posting_ID = a.Posting_ID
                
                where a.GL_ID IN (15774615, 15774616, 15790482, 15790530, 15774617, 15774618, 27413065)
                    and a.PostingDate between :dateFrom and :dateTo
                ORDER BY year(a.PostingDate), month(a.PostingDate) asc
                WITH (nolock)
            ";

        $query = $this->db->prepare($qry);
        $query->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
        $query->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
        $query->execute();
        $revenue = $query->fetchAll(PDO::FETCH_ASSOC);

        $total = 0;
        $weightedTotal = 0;
        $productSalesCost = 0;
        $graphicsSalesCost = 0;
        foreach ($results as $row) {
            $total += $row['TOTAL'];
            $weightedTotal += $row['BLENDEDTOTAL'];
            $productSalesCost += $row['PRODUCTCOST'] * $row['QUANTITYINVOICED'];
            if ($row['IDH_ACCT'] == 47500) {
                $graphicsSalesCost += $row['PRODUCTCOST'] * $row['QUANTITYINVOICED'];
            }
        }

        $obj = array(
            "details"  => $results, "revenue" => $revenue, "blendedTotal" => array(
                "productSalesCost" => $productSalesCost,
                "graphicsSalesCost" => $graphicsSalesCost,
                "blendedTotal" => $weightedTotal != 0 ? $weightedTotal / $total * 100 : 0
            )
        );

        return $obj;
    }

    public function __destruct()
    {

        $this->db = null;
    }
}
