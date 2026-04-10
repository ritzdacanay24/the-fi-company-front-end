<?php
use EyefiDb\Databases\DatabaseEyefi;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require('/var/www/html/downloads/fpdf186/fpdf.php');


class PDF_MC_Table extends FPDF
{
    protected $widths;
    protected $aligns;
    protected $toLocation;

        // Page header
function Header()
{
    // Logo
    $this->SetY(5);
    $this->Image('/var/www/html/attachments/igt.png',25,6,45);

    // Arial bold 15
    $this->SetFont('Arial','B',15);
    // Move to the right
    $this->Cell(200);
    // Title
    $this->Cell(30,10,'PRODUCT TRANSFER FORM',0,0,'C');
    // Line break
    $this->Ln(5);


    $this->Cell(200);
    $this->SetFont('Arial','B',9);
    $this->Cell(30,10,"IGT Internal transaction: 311 to $this->toLocation",0,0,'C');
    // Line break
    $this->Ln(5);
}
function Header2($transfer, $description, $date)
{
    // Logo
    $this->Cell(15);
    $this->Cell(1,20,"Transfer Reference:",0,0,'L');
    $this->Cell(30);
    $this->Cell(1,20,"$transfer",0,0,'L');
    $this->Ln(5);
    $this->Cell(15);
    $this->Cell(1,20,"Description:",0,0,'L');
    $this->Cell(18);
    $this->Cell(1,20,"$description",0,0,'L');


    $this->Cell(145);
    $this->Cell(30,10,"Date: $date" ,0,0,'C');

    $this->Ln(20);
}
function UnderTable($signature, $printedName, $date)
{
    // Logo
    $this->Cell(15);
    $this->Cell(1,20,"Eyefi Signature:",0,0,'L');
    $this->Cell(25);
    $this->SetFont('times','I', 14);
    $this->Cell(1,20,"$signature",0,0,'L');
    $this->SetFont('Arial','',9);
    $this->Ln(6);
    $this->Cell(15);
    $this->Cell(1,20,"Print Name:",0,0,'L');
    $this->Cell(18);
    $this->Cell(1,20,"$printedName",0,0,'L');
    $this->Ln(6);
    $this->Cell(15);
    $this->Cell(1,20,"Date:",0,0,'L');
    $this->Cell(8);
    $this->Cell(1,20,"$date",0,0,'L');

    $this->Ln(20);
}
function setToLocation($toLocation){
    
    $this->toLocation = $toLocation;
}

// Page footer
// function Footer()
// {
//     // Position at 1.5 cm from bottom
//     $this->SetY(-15);
//     // Arial italic 8
//     $this->SetFont('Arial','I',8);
//     // Page number
//     $this->Cell(0,10,'Page '.$this->PageNo().'/{nb}',0,0,'C');
// }

    function SetWidths($w)
    {
        // Set the array of column widths
        $this->widths = $w;
    }

    function SetAligns($a)
    {
        // Set the array of column alignments
        $this->aligns = $a;
    }

    function Row($data)
    {
        // Calculate the height of the row
        $nb = 0;
        for($i=0;$i<count($data);$i++)
            $nb = max($nb,$this->NbLines($this->widths[$i],$data[$i]));
        $h = 5*$nb;
        // Issue a page break first if needed
        $this->CheckPageBreak($h);
        // Draw the cells of the row
        for($i=0;$i<count($data);$i++)
        {
            $w = $this->widths[$i];
            $a = isset($this->aligns[$i]) ? $this->aligns[$i] : 'L';
            // Save the current position
            $x = $this->GetX();
            $y = $this->GetY();
            // Draw the border
            $this->Rect($x,$y,$w,$h);
            // Print the text
            $this->MultiCell($w,5,$data[$i],0,$a);
            // Put the position to the right of the cell
            $this->SetXY($x+$w,$y);
        }
        // Go to the next line
        $this->Ln($h);
    }

    function CheckPageBreak($h)
    {
        // If the height h would cause an overflow, add a new page immediately
        if($this->GetY()+$h>$this->PageBreakTrigger)
            $this->AddPage($this->CurOrientation);
    }

    function NbLines($w, $txt)
    {
        // Compute the number of lines a MultiCell of width w will take
        if(!isset($this->CurrentFont))
            $this->Error('No font has been set');
        $cw = $this->CurrentFont['cw'];
        if($w==0)
            $w = $this->w-$this->rMargin-$this->x;
        $wmax = ($w-2*$this->cMargin)*1000/$this->FontSize;
        $s = str_replace("\r",'',(string)$txt);
        $nb = strlen($s);
        if($nb>0 && $s[$nb-1]=="\n")
            $nb--;
        $sep = -1;
        $i = 0;
        $j = 0;
        $l = 0;
        $nl = 1;
        while($i<$nb)
        {
            $c = $s[$i];
            if($c=="\n")
            {
                $i++;
                $sep = -1;
                $j = $i;
                $l = 0;
                $nl++;
                continue;
            }
            if($c==' ')
                $sep = $i;
            $l += $cw[$c];
            if($l>$wmax)
            {
                if($sep==-1)
                {
                    if($i==$j)
                        $i++;
                }
                else
                    $i = $sep+1;
                $sep = -1;
                $j = $i;
                $l = 0;
                $nl++;
            }
            else
                $i++;
        }
        return $nl;
    }
}


$post = json_decode(file_get_contents('php://input'), true);


function GenerateWord()
{
    // Get a random word
    $nb = rand(3, 10);
    $w = '';
    for($i=1;$i<=$nb;$i++)
        $w .= chr(rand(ord('a'), ord('z')));
    return $w;
}

function GenerateSentence()
{
    // Get a random sentence
    $nb = rand(1, 10);
    $s = '';
    for($i=1;$i<=$nb;$i++)
        $s .= GenerateWord().' ';
    return substr($s, 0, -1);
}


$timeStamp  =time();

//$file = "/var/www/html/attachments/igtTransfer/IGT_Transfer_$timeStamp.pdf";

// $pdf = new PDF();
// // Column headings
// $header = array('SO Line #', 'Part #', 'Description', 'Qty', 'From/Loc', 'To/Loc', 'Pallet #', 'S/N');
// // Data loading
// //$data = $pdf->LoadData($post);
// $pdf->SetFont('Arial','',8);
// $pdf->AddPage();
// $pdf->Header2("transferssssssssssssss", "descriptiondddddddddd", "2023-10-01");
// $pdf->BasicTable($header,$post);
// $pdf->AddPage();
// $pdf->Output($file,'F');


$otherValues = $post['otherValues'];
$date = date("Y-m-d");;

$pdf = new PDF_MC_Table('L','mm','A4');

$pdf->setToLocation($otherValues['to_loc']);

$pdf->AddPage();

$pdf->Header2($otherValues['transfer_reference'], $otherValues['description'], $date);

$pdf->SetFont('Arial', '', 10);
// Table with 20 rows and 4 columns
$pdf->SetWidths(array(55, 100, 15, 20, 20, 30, 40));
$pdf->Row(array('Part #', 'Description', 'Qty', 'From/Loc', 'To/Loc', 'Pallet #', 'S/N'));


// Data
$serialNumbers = array();

foreach($post['data'] as $row)
        {
            $pdf->Row(array(
                $row['part'],
                $row['description'],
                $row['qty'],
                $row['from_loc'],
                $row['to_loc'],
                $row['pallet_number'],
                $row['sn']
            ));
            if($row['sn'] != 'NA') $serialNumbers[] = $row['sn'];
        }


        $pdf->UnderTable($otherValues['printedName'], $otherValues['printedName'], $date);




    $mail = new PHPMailer(true);
    $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
    $mail->Priority = 2;
    $mail->isHTML(true);
            $mail->CharSet = 'UTF-8';		

    $subject_line = "";

    
    $sn = "";
    if($serialNumbers){
        $sn = " SN# " . implode(", ", $serialNumbers);
    }
    
    $subject_line = $otherValues['transfer_reference'] . ' - ' . $otherValues['description'] . $sn;
    $mail->Subject = $subject_line;


    if($otherValues['to_loc'] == "R200"){
        //$to = "alison.corona@igt.com, jerrold.edward@igt.com, jessica.moralesvega@igt.com, julie.powell@igt.com, kristine.moli@igt.com, marietta.moli@igt.com, monica.nava@igt.com, victor.swanson@igt.com";
        //$cc = "adriann.k@the-fi-company.com, bryan.kozak@the-fi-company.com, eyefilogistics@the-fi-company.com, gregory.nix@the-fi-company.com, mary.tavita@the-fi-company.com, monica.hubbard@the-fi-company.com, nick.walter@the-fi-company.com, trang.tran@the-fi-company.com, willie.jenkunprasuit@the-fi-company.com";

        $to         = emailNotification('igt_transfer_location_R200');
        $cc = "";

        $to_array = explode(',', $to);
        foreach($to_array as $address)
        {
            $mail->addAddress($address);
        }

        
        if($cc != ""){
            $to_array = explode(',', $cc);
            foreach($to_array as $address)
            {
                $mail->addCC($address);
            }
        }
        
        


        $mail->Body =  "
            Hello, <br/><br/>

            Attached transfer for above referenced sign, shipping to Reno tonight. <br/><br/>

            Thanks, <br/><br/>

            <img src='https://dashboard.eye-fi.com/test/signatures/Picture1.png' alt='The Fi Company' style='width:100px'/>

        ";

    }

    if($otherValues['to_loc'] == "Z024"){
        //$to = "alison.corona@igt.com, jerrold.edward@igt.com, jessica.moralesvega@igt.com, julie.powell@igt.com, kristine.moli@igt.com, marietta.moli@igt.com, monica.nava@igt.com, victor.swanson@igt.com";
        //$cc = "adriann.k@the-fi-company.com, eyefilogistics@the-fi-company.com, gregory.nix@the-fi-company.com, mary.tavita@the-fi-company.com, monica.hubbard@the-fi-company.com, nick.walter@the-fi-company.com, trang.tran@the-fi-company.com, willie.jenkunprasuit@the-fi-company.com, DG.LasVegasFieldServiceTeam@igt.com, simona.jones@the-fi-company.com, juvenal.torres@the-fi-company.com";

        $to         = emailNotification('igt_transfer_location_Z024');
        $cc = "ritz.dacanay@the-fi-company.com";

        $to_array = explode(',', $to);
        foreach($to_array as $address)
        {
            $mail->addAddress($address);
        }

        
        if($cc != ""){
            $to_array = explode(',', $cc);
            foreach($to_array as $address)
            {
                $mail->addCC($address);
            }
        }

        $mail->Body =  "
            Hello, <br/><br/>

            Attached transfer for above referenced sign, being transferred to Field Service today. <br/><br/>

            Thanks, <br/><br/>

            <img src='https://dashboard.eye-fi.com/test/signatures/Picture1.png' alt='The Fi Company' style='width:100px'/>


        ";
    
    }


    //$mail->addBCC('ritz.dacanay@the-fi-company.com', 'Ritz Dacanay');     //Add a recipient

    $file = "/var/www/html/attachments/igtTransfer/$subject_line.pdf";

    $pdf->Output($file,'F');

    $mail->addAttachment($file);         //Add attachments

    

    $mail->send();