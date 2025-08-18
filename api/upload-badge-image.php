<?php
// upload-badge-image.php - Upload ottimizzato per immagini tesserini con logging migliorato
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', 'badge_upload_errors.log');

// Headers CORS e JSON
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Funzione per logging strutturato
function logMessage($level, $message, $data = null) {
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] [$level] $message";
    if ($data) {
        $logEntry .= " | Data: " . json_encode($data);
    }
    error_log($logEntry);
}

// Funzione per risposta JSON sicura
function sendJsonResponse($data, $httpCode = 200) {
    http_response_code($httpCode);
    echo json_encode($data);
    exit();
}

// Gestione CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    logMessage('INFO', 'CORS preflight request handled');
    sendJsonResponse(['message' => 'CORS preflight handled']);
}

// Solo POST consentito
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    logMessage('ERROR', 'Invalid HTTP method', ['method' => $_SERVER['REQUEST_METHOD']]);
    sendJsonResponse(['success' => false, 'message' => 'Metodo non consentito'], 405);
}

logMessage('INFO', 'Badge image upload request started', [
    'method' => $_SERVER['REQUEST_METHOD'],
    'uri' => $_SERVER['REQUEST_URI'],
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown'
]);

// Configurazione
$uploadDir = '../assets/img/badges/';
$maxFileSize = 5 * 1024 * 1024; // 5MB
$allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
$allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

logMessage('INFO', 'Upload configuration', [
    'uploadDir' => $uploadDir,
    'maxFileSize' => $maxFileSize,
    'allowedTypes' => $allowedTypes
]);

// Crea directory se non esiste
if (!is_dir($uploadDir)) {
    logMessage('INFO', 'Creating upload directory', ['dir' => $uploadDir]);
    if (!mkdir($uploadDir, 0755, true)) {
        logMessage('ERROR', 'Failed to create upload directory', ['dir' => $uploadDir]);
        sendJsonResponse(['success' => false, 'message' => 'Impossibile creare la cartella di destinazione']);
    }
    logMessage('INFO', 'Upload directory created successfully');
}

// Log dei dati ricevuti
logMessage('INFO', 'Request data received', [
    'POST' => $_POST,
    'FILES' => array_map(function($file) {
        return [
            'name' => $file['name'] ?? 'N/A',
            'size' => $file['size'] ?? 0,
            'type' => $file['type'] ?? 'N/A',
            'error' => $file['error'] ?? 'N/A'
        ];
    }, $_FILES)
]);

// Verifica upload
if (!isset($_FILES['badgeImage']) || $_FILES['badgeImage']['error'] !== UPLOAD_ERR_OK) {
    $errorMessage = 'Errore nel caricamento del file';
    
    if (isset($_FILES['badgeImage']['error'])) {
        $errorCode = $_FILES['badgeImage']['error'];
        logMessage('ERROR', 'Upload error detected', ['error_code' => $errorCode]);
        
        switch ($errorCode) {
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                $errorMessage = 'File troppo grande (max 5MB)';
                break;
            case UPLOAD_ERR_PARTIAL:
                $errorMessage = 'Caricamento parziale del file';
                break;
            case UPLOAD_ERR_NO_FILE:
                $errorMessage = 'Nessun file selezionato';
                break;
            case UPLOAD_ERR_NO_TMP_DIR:
                $errorMessage = 'Cartella temporanea mancante';
                break;
            case UPLOAD_ERR_CANT_WRITE:
                $errorMessage = 'Impossibile scrivere il file';
                break;
            case UPLOAD_ERR_EXTENSION:
                $errorMessage = 'Estensione file bloccata dal server';
                break;
        }
    } else {
        logMessage('ERROR', 'No badgeImage in FILES array');
    }
    
    sendJsonResponse(['success' => false, 'message' => $errorMessage]);
}

$file = $_FILES['badgeImage'];

logMessage('INFO', 'File details', [
    'name' => $file['name'],
    'size' => $file['size'],
    'type' => $file['type'],
    'tmp_name' => $file['tmp_name']
]);

// Validazioni dimensione
if ($file['size'] > $maxFileSize) {
    logMessage('ERROR', 'File too large', [
        'size' => $file['size'],
        'max_allowed' => $maxFileSize
    ]);
    sendJsonResponse(['success' => false, 'message' => 'File troppo grande. Massimo 5MB consentiti']);
}

// Validazioni tipo MIME
if (!in_array($file['type'], $allowedTypes)) {
    logMessage('ERROR', 'Invalid MIME type', [
        'provided' => $file['type'],
        'allowed' => $allowedTypes
    ]);
    sendJsonResponse(['success' => false, 'message' => 'Tipo di file non consentito. Usa JPG, PNG, GIF o WebP']);
}

// Verifica che sia realmente un'immagine
$imageInfo = getimagesize($file['tmp_name']);
if ($imageInfo === false) {
    logMessage('ERROR', 'File is not a valid image', ['file' => $file['name']]);
    sendJsonResponse(['success' => false, 'message' => 'Il file non è un\'immagine valida']);
}

logMessage('INFO', 'Image validation passed', [
    'width' => $imageInfo[0],
    'height' => $imageInfo[1],
    'type' => $imageInfo[2],
    'mime' => $imageInfo['mime']
]);

// Ottieni informazioni file
$fileInfo = pathinfo($file['name']);
$extension = strtolower($fileInfo['extension']);

if (!in_array($extension, $allowedExtensions)) {
    logMessage('ERROR', 'Invalid file extension', [
        'provided' => $extension,
        'allowed' => $allowedExtensions
    ]);
    sendJsonResponse(['success' => false, 'message' => 'Estensione file non consentita']);
}

// Genera nome file sicuro
$fileId = isset($_POST['fileId']) ? preg_replace('/[^a-z0-9\-_]/', '', strtolower($_POST['fileId'])) : '';
if (empty($fileId)) {
    logMessage('ERROR', 'Missing or invalid fileId', ['provided' => $_POST['fileId'] ?? 'NULL']);
    sendJsonResponse(['success' => false, 'message' => 'ID file mancante o non valido']);
}

$fileName = $fileId . '.' . $extension;
$filePath = $uploadDir . $fileName;

logMessage('INFO', 'File processing', [
    'fileId' => $fileId,
    'fileName' => $fileName,
    'filePath' => $filePath
]);

// Verifica permessi directory
if (!is_writable($uploadDir)) {
    logMessage('ERROR', 'Upload directory not writable', ['dir' => $uploadDir]);
    sendJsonResponse(['success' => false, 'message' => 'Cartella di destinazione non scrivibile']);
}

// Sposta il file
if (move_uploaded_file($file['tmp_name'], $filePath)) {
    logMessage('INFO', 'File moved successfully', ['from' => $file['tmp_name'], 'to' => $filePath]);
    
    // Verifica che il file sia stato effettivamente creato
    if (!file_exists($filePath)) {
        logMessage('ERROR', 'File not found after move', ['path' => $filePath]);
        sendJsonResponse(['success' => false, 'message' => 'File non trovato dopo lo spostamento']);
    }
    
    // Ottimizza l'immagine
    $optimized = optimizeImage($filePath, $imageInfo[2]);
    
    logMessage('INFO', 'Upload completed successfully', [
        'fileName' => $fileName,
        'filePath' => $filePath,
        'optimized' => $optimized,
        'finalSize' => filesize($filePath)
    ]);
    
    sendJsonResponse([
        'success' => true,
        'message' => 'Immagine caricata con successo',
        'fileName' => $fileName,
        'filePath' => '../assets/img/badges/' . $fileName,
        'optimized' => $optimized,
        'originalSize' => $file['size'],
        'finalSize' => filesize($filePath)
    ]);
} else {
    logMessage('ERROR', 'Failed to move uploaded file', [
        'from' => $file['tmp_name'],
        'to' => $filePath,
        'upload_dir_exists' => is_dir($uploadDir),
        'upload_dir_writable' => is_writable($uploadDir),
        'tmp_file_exists' => file_exists($file['tmp_name'])
    ]);
    sendJsonResponse(['success' => false, 'message' => 'Errore nel salvataggio del file']);
}

/**
 * Ottimizza l'immagine riducendo dimensioni e qualità se necessario
 */
function optimizeImage($filePath, $imageType) {
    $maxWidth = 400;
    $maxHeight = 400;
    $quality = 85;
    
    try {
        logMessage('INFO', 'Starting image optimization', ['file' => $filePath]);
        
        // Ottieni dimensioni originali
        list($width, $height) = getimagesize($filePath);
        logMessage('INFO', 'Original image dimensions', ['width' => $width, 'height' => $height]);
        
        // Se l'immagine è già piccola, non ottimizzare
        if ($width <= $maxWidth && $height <= $maxHeight) {
            logMessage('INFO', 'Image already optimal size, skipping optimization');
            return false;
        }
        
        // Calcola nuove dimensioni mantenendo le proporzioni
        $ratio = min($maxWidth / $width, $maxHeight / $height);
        $newWidth = intval($width * $ratio);
        $newHeight = intval($height * $ratio);
        
        logMessage('INFO', 'Calculated new dimensions', [
            'ratio' => $ratio,
            'newWidth' => $newWidth,
            'newHeight' => $newHeight
        ]);
        
        // Crea immagine sorgente
        $source = null;
        switch ($imageType) {
            case IMAGETYPE_JPEG:
                $source = imagecreatefromjpeg($filePath);
                break;
            case IMAGETYPE_PNG:
                $source = imagecreatefrompng($filePath);
                break;
            case IMAGETYPE_GIF:
                $source = imagecreatefromgif($filePath);
                break;
            case IMAGETYPE_WEBP:
                if (function_exists('imagecreatefromwebp')) {
                    $source = imagecreatefromwebp($filePath);
                }
                break;
            default:
                logMessage('WARNING', 'Unsupported image type for optimization', ['type' => $imageType]);
                return false;
        }
        
        if (!$source) {
            logMessage('ERROR', 'Failed to create source image');
            return false;
        }
        
        // Crea immagine destinazione
        $destination = imagecreatetruecolor($newWidth, $newHeight);
        
        // Mantieni trasparenza per PNG e GIF
        if ($imageType == IMAGETYPE_PNG || $imageType == IMAGETYPE_GIF) {
            imagealphablending($destination, false);
            imagesavealpha($destination, true);
            $transparent = imagecolorallocatealpha($destination, 255, 255, 255, 127);
            imagefilledrectangle($destination, 0, 0, $newWidth, $newHeight, $transparent);
        }
        
        // Ridimensiona con alta qualità
        imagecopyresampled($destination, $source, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
        
        // Salva immagine ottimizzata
        $saveResult = false;
        switch ($imageType) {
            case IMAGETYPE_JPEG:
                $saveResult = imagejpeg($destination, $filePath, $quality);
                break;
            case IMAGETYPE_PNG:
                $saveResult = imagepng($destination, $filePath, 9);
                break;
            case IMAGETYPE_GIF:
                $saveResult = imagegif($destination, $filePath);
                break;
            case IMAGETYPE_WEBP:
                if (function_exists('imagewebp')) {
                    $saveResult = imagewebp($destination, $filePath, $quality);
                }
                break;
        }
        
        // Pulisci memoria
        imagedestroy($source);
        imagedestroy($destination);
        
        if ($saveResult) {
            logMessage('INFO', 'Image optimization completed successfully', [
                'originalSize' => "$width x $height",
                'newSize' => "$newWidth x $newHeight",
                'fileSizeBefore' => filesize($filePath),
                'fileSizeAfter' => filesize($filePath)
            ]);
        } else {
            logMessage('ERROR', 'Failed to save optimized image');
        }
        
        return $saveResult;
        
    } catch (Exception $e) {
        logMessage('ERROR', 'Exception during image optimization', [
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]);
        return false;
    }
}

logMessage('INFO', 'Badge image upload request completed');
?>