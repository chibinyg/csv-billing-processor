import {
    Typography,
    Container,
    Button,
    Paper,
    Stack,
    Divider,
    LinearProgress,
} from "@mui/material"
import UploadFileIcon from "@mui/icons-material/UploadFile"
import DownloadIcon from "@mui/icons-material/Download"
import { useState } from "react"

// API endpoint for CSV to Excel conversion
const API_URL = "https://r01s9indk6.execute-api.us-west-2.amazonaws.com/prod"

/**
 * Body component - Main UI for CSV to Excel file conversion
 * Handles file selection, upload, conversion via API, and download of converted file
 */
const Body = () => {
    // State for selected file, loading status, error messages, and converted result
    const [file, setFile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [convertedFile, setConvertedFile] = useState(null)

    // Handles file input change - resets previous state when new file is selected
    const handleFileChange = (e) => {
        setFile(e.target.files[0] || null)
        setError("")
        setConvertedFile(null)
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
                    <Button
                        variant="outlined"
                        component="label"
                        startIcon={<UploadFileIcon />}
                        size="large"
                    >
                        Select File
                        <input
                            type="file"
                            hidden
                            accept=".csv,.txt,text/csv,text/plain"
                            onChange={handleFileChange}
                        />
                    </Button>

                    {file && (
                        <Typography variant="body2" color="text.secondary">
                            {file.name} ({(file.size / 1024).toFixed(2)} KB)
                        </Typography>
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

export default Body