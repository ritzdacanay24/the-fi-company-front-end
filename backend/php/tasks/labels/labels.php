
<html>
    <body>
        <style>
            form {
  position: relative;
}

input {
  width: 300px;
  padding-right: 40px;
}

button {
  position: absolute;
  top: 0;
  right: 0;
}
</style>
    <h2>(tr_hist) Price History for <?php echo ISSET($_GET['search']) ? $_GET['search'] : '' ?></h2>

    <div style="width:400px">
        <form action="quotes.php" method="get">
        Search <input type="search" name="search" placeholder="Search by part number" value="<?php echo ISSET($_GET['search']) ? $_GET['search'] : '' ?>"><br>
        <button type="submit">Submit</button>
        </form>
        <div>
    </body>
</html>
<?php


