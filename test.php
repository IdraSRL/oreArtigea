<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_FILES['test_file']) && $_FILES['test_file']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = __DIR__ . '/uploads/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true); // Crea la cartella se non esiste
        }

        $fileName = basename($_FILES['test_file']['name']);
        $targetPath = $uploadDir . $fileName;

        if (move_uploaded_file($_FILES['test_file']['tmp_name'], $targetPath)) {
            echo "<p style='color:green;'>File caricato con successo in: uploads/$fileName</p>";
        } else {
            echo "<p style='color:red;'>Errore nel salvataggio del file.</p>";
        }
    } else {
        echo "<p style='color:red;'>Errore durante il caricamento del file: " . $_FILES['test_file']['error'] . "</p>";
    }
}
?>

<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <title>Test Upload PHP</title>
</head>
<body>
    <h2>Test Upload File (PHP)</h2>
    <form action="upload-test.php" method="post" enctype="multipart/form-data">
        <label>Seleziona un file da caricare:</label><br><br>
        <input type="file" name="test_file" required><br><br>
        <button type="submit">Carica File</button>
    </form>
</body>
</html>
