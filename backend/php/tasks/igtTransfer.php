<?php
use EyefiDb\Databases\DatabaseEyefi;


require('/var/www/html/downloads/fpdf186/fpdf.php');

class PDF extends FPDF
{
    // Page header
function Header()
{
    // Logo
    $this->SetY(5);
    $this->Image('/var/www/html/attachments/igt.png',25,6,45);

    // Arial bold 15
    $this->SetFont('Arial','B',15);
    // Move to the right
    $this->Cell(130);
    // Title
    $this->Cell(30,10,'PRODUCT TRANSFER FORM',0,0,'C');
    // Line break
    $this->Ln(5);


    $this->Cell(130);
    $this->SetFont('Arial','B',9);
    $this->Cell(30,10,'IGT Internal transaction: 311 to Z024',0,0,'C');
    // Line break
    $this->Ln(5);
}
function Header2($transfer, $description, $date)
{
    // Logo
    $this->Cell(15);
    $this->Cell(1,20,"Transfer Reference:",0,0,'L');
    $this->Cell(25);
    $this->Cell(1,20,"$transfer",0,0,'L');
    $this->Ln(5);
    $this->Cell(15);
    $this->Cell(1,20,"Description:",0,0,'L');
    $this->Cell(15);
    $this->Cell(1,20,"$description",0,0,'L');


    $this->Cell(70);
    $this->Cell(30,10,"Date: $date" ,0,0,'C');

    $this->Ln(20);
}

// Page footer
function Footer()
{
    // Position at 1.5 cm from bottom
    $this->SetY(-15);
    // Arial italic 8
    $this->SetFont('Arial','I',8);
    // Page number
    $this->Cell(0,10,'Page '.$this->PageNo().'/{nb}',0,0,'C');
}

    // Load data
    function LoadData($file)
    {
        // Read file lines
        $lines = file($file);
        $data = array();
        foreach($lines as $line)
            $data[] = explode(';',trim($line));
        return $data;
    }

    // Simple table
    function BasicTable($header, $data)
    {
        // Header
        foreach($header as $col)
            $this->Cell(22,7,$col,1);
        $this->Ln();
        // Data
        foreach($data as $row)
        {
            foreach($row as $col)
                $this->Cell(22,6,$col,1);
            $this->Ln();
        }
    }

    // Better table
    function ImprovedTable($header, $data)
    {
        // Column widths
        $w = array(30, 30, 30, 30, 30, 30, 30, 30);
        // Header
        for($i=0;$i<count($header);$i++)
            $this->Cell($w[$i],7,$header[$i],1,0,'C');
        $this->Ln();
        // Data
        foreach($data as $row)
        {
            $this->Cell($w[0],6,$row[0],'LR');
            $this->Cell($w[1],6,$row[1],'LR');
            $this->Cell($w[2],6,$row[2],'LR');
            $this->Cell($w[3],6,$row[3],'LR');
            $this->Cell($w[4],6,$row[4],'LR');
            $this->Cell($w[5],6,$row[5],'LR');
            $this->Cell($w[6],6,$row[6],'LR');
            $this->Cell($w[7],6,$row[7],'LR');
            $this->Ln();
        }
        // Closing line
        $this->Cell(array_sum($w),0,'','T');
    }

    // Colored table
    function FancyTable($header, $data)
    {
        // Colors, line width and bold font
        $this->SetFillColor(255,0,0);
        $this->SetTextColor(255);
        $this->SetDrawColor(128,0,0);
        $this->SetLineWidth(.3);
        $this->SetFont('','B');
        // Header
        $w = array(30, 30, 30, 30, 30, 30, 30, 30);
        for($i=0;$i<count($header);$i++)
            $this->Cell($w[$i],7,$header[$i],1,0,'C',true);
        $this->Ln();
        // Color and font restoration
        $this->SetFillColor(224,235,255);
        $this->SetTextColor(0);
        $this->SetFont('');
        // Data
        $fill = false;
        foreach($data as $row)
        {
            $this->Cell($w[0],6,$row[0],'LR');
            $this->Cell($w[1],6,$row[1],'LR');
            $this->Cell($w[2],6,$row[2],'LR');
            $this->Cell($w[3],6,$row[3],'LR');
            $this->Cell($w[4],6,$row[4],'LR');
            $this->Cell($w[5],6,$row[5],'LR');
            $this->Cell($w[6],6,$row[6],'LR');
            $this->Cell($w[7],6,$row[7],'LR');
            $this->Ln();
            $fill = !$fill;
        }
        // Closing line
        $this->Cell(array_sum($w),0,'','T');
    }
    
}

$post = json_decode(file_get_contents('php://input'), true);

echo json_encode($post);


$pdf = new PDF();
// Column headings
$header = array('SO Line #', 'Part #', 'Description', 'Qty', 'From/Loc', 'To/Loc', 'Pallet #', 'S/N');
// Data loading
$data = $pdf->LoadData('/var/www/html/downloads/fpdf186/tutorial/countries.txt');
$pdf->SetFont('Arial','',8);
$pdf->AddPage();
$pdf->Header2("transferssssssssssssss", "descriptiondddddddddd", "2023-10-01");
$pdf->BasicTable($header,$data);
$pdf->AddPage();
$pdf->Output();