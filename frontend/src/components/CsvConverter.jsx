import {
    Typography,
    Container,
    Button,
    Paper,
    Stack,
    Divider,
    LinearProgress,
    Chip,
    Box,
} from "@mui/material"
import UploadFileIcon from "@mui/icons-material/UploadFile"
import DownloadIcon from "@mui/icons-material/Download"
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile"
import { useState } from "react"

// API endpoint for CSV to Excel conversion
const API_URL = import.meta.env.VITE_API_URL

/**
 * CsvConverter component - Main UI for CSV to Excel file conversion
 * Handles file selection, upload, conversion via API, and download of converted file
 */
const CsvConverter = () => {
    // State for selected file, loading status, error messages, and converted result
    const [file, setFile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [convertedFile, setConvertedFile] = useState(null)
    const [isDragging, setIsDragging] = useState(false)

    // Handles file input change - resets previous state when new file is selected
    const handleFileChange = (e) => {
        setFile(e.target.files[0] || null)
        setError("")
        setConvertedFile(null)
    }

    // Clears the selected file
    const handleClearFile = () => {
        setFile(null)
        setError("")
        setConvertedFile(null)
    }

    // Validates if a file is an accepted type
    const isValidFileType = (file) => {
        const validTypes = ['.csv', '.txt', 'text/csv', 'text/plain']
        return validTypes.some(type =>
            file.name.toLowerCase().endsWith(type) || file.type === type
        )
    }

    // Handles drag over event
    const handleDragOver = (e) => {
        e.preventDefault()
        setIsDragging(true)
    }

    // Handles drag leave event
    const handleDragLeave = (e) => {
        e.preventDefault()
        setIsDragging(false)
    }

    // Handles file drop
    const handleDrop = (e) => {
        e.preventDefault()
        setIsDragging(false)
        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile && isValidFileType(droppedFile)) {
            setFile(droppedFile)
            setError("")
            setConvertedFile(null)
        } else if (droppedFile) {
            setError("Please drop a CSV or TXT file")
        }
    }

    // Handles file conversion by sending the selected file to the API
    const handleConvert = async () => {
        // Show loading state and reset previous errors/results
        setLoading(true)
        setError("")
        setConvertedFile(null)

        try {
            // Prepare form data with the selected file and send file as multipart/form-data
            const formData = new FormData()
            formData.append('file', file)
            
            // Send POST request to API with Accept header for binary response
            const response = await fetch(API_URL, {
                method: "POST",
                body: formData,
                headers: {
                    'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            })

            // Check if response is successful
            if (!response.ok) {
                throw new Error(`Conversion failed: ${response.statusText}`)
            }

            // successful response - get converted file as binary blob
            const blob = await response.blob()

            // Extract filename from response headers or default to original name with .xlsx extension
            const filename = response.headers.get('content-disposition')
                ?.match(/filename="([^"]+)"/)?.[1] || file.name.replace(/\.(csv|txt)$/i, '.xlsx')

            // Store converted file in state
            setConvertedFile({ filename, blob })
        } catch (err) {
            setError(err.message || "An error occurred during conversion")
            console.error("Conversion error:", err)
        } finally {
            setLoading(false)
        }
    }

    // Triggers download of the converted file using a temporary anchor element
    const handleDownload = () => {
        if (!convertedFile) return
        const url = URL.createObjectURL(convertedFile.blob)
        const link = document.createElement("a")
        link.href = url
        link.download = convertedFile.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    return (
        <Container maxWidth="md" sx={{ mt: 6, mb: 6, flexGrow: 1 }}>
            <Paper elevation={3} sx={{ p: 3 }}>
                <Typography
                    variant="h4"
                    component="h1"
                    gutterBottom
                    textAlign="center"
                >
                    CSV to Excel Converter
                </Typography>
                <Typography
                    variant="body1"
                    color="text.secondary"
                    textAlign="center"
                    gutterBottom
                >
                    Upload a CSV file to convert it to Excel format.
                </Typography>

                <Divider sx={{ my: 3 }} />

                <Stack spacing={3} alignItems="center">
                    {!file ? (
                        <Box
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            sx={{
                                border: '2px dashed',
                                borderColor: isDragging ? 'primary.main' : 'grey.400',
                                borderRadius: 5,
                                p: 2,
                                textAlign: 'center',
                                bgcolor: isDragging ? 'action.hover' : 'transparent',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer',
                                maxWidth: 400,
                            }}
                        >
                            <UploadFileIcon sx={{ fontSize: 48, color: 'grey.500', mb: 1 }} />
                            <Typography variant="body1" color="text.secondary" gutterBottom>
                                Drag and drop your file here
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                or
                            </Typography>
                            <Button
                                variant="outlined"
                                component="label"
                                size="large"
                            >
                                Browse Files
                                <input
                                    type="file"
                                    hidden
                                    accept=".csv,.txt,text/csv,text/plain"
                                    onChange={handleFileChange}
                                />
                            </Button>
                        </Box>
                    ) : (
                        <Chip
                            icon={<InsertDriveFileIcon />}
                            label={`${file.name} (${(file.size / 1024).toFixed(2)} KB)`}
                            onDelete={handleClearFile}
                            color="primary"
                            variant="outlined"
                        />
                    )}

                    {loading && (
                        <>
                            <LinearProgress sx={{ width: "100%" }} />
                            <Typography variant="body2" color="text.secondary">
                                Converting...
                            </Typography>
                        </>
                    )}

                    {error && (
                        <Typography color="error" variant="body2">
                            {error}
                        </Typography>
                    )}

                    <Button
                        variant="contained"
                        size="large"
                        onClick={handleConvert}
                        disabled={loading || !file}
                    >
                        {loading ? "Converting..." : "Convert to Excel"}
                    </Button>

                    {convertedFile && (
                        <Button
                            variant="contained"
                            color="success"
                            size="large"
                            startIcon={<DownloadIcon />}
                            onClick={handleDownload}
                        >
                            Download {convertedFile.filename}
                        </Button>
                    )}
                </Stack>
            </Paper>
        </Container>
    )
}

export default CsvConverter