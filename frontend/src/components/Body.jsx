import {
    Typography,
    Container,
    Button,
    Paper,
    Stack,
    Divider,
    LinearProgress,
    List,
    ListItem,
    ListItemText,
} from "@mui/material"
import UploadFileIcon from "@mui/icons-material/UploadFile"
import DownloadIcon from "@mui/icons-material/Download"
import { useState } from "react"

const API_URL = "https://o9tfc1nqbh.execute-api.us-west-2.amazonaws.com/dev"

const Body = () => {
    const [files, setFiles] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [convertedFiles, setConvertedFiles] = useState([])

    const handleFileChange = (e) => {
        setFiles([...e.target.files])
        setError("")
        setConvertedFiles([])
    }

    const handleConvert = async () => {
        if (files.length === 0) {
            setError("Please select at least one file")
            return
        }

        setLoading(true)
        setError("")
        setConvertedFiles([])

        try {
            const formData = new FormData()
            for (const file of files) {
                formData.append('files', file)
            }

            const response = await fetch(API_URL, {
                method: "POST",
                body: formData,
                // Don't set Content-Type - browser sets it automatically with boundary
            })

            if (!response.ok) {
                throw new Error(`Conversion failed: ${response.statusText}`)
            }

            const contentType = response.headers.get('content-type')

            if (contentType?.includes('application/zip')) {
                // Multiple files returned as ZIP
                const blob = await response.blob()
                setConvertedFiles([{
                    filename: 'converted_files.zip',
                    blob: blob,
                    originalName: 'Multiple files'
                }])
            } else if (contentType?.includes('application/vnd.openxmlformats')) {
                // Single Excel file
                const blob = await response.blob()
                const filename = response.headers.get('content-disposition')
                    ?.match(/filename="?(.+)"?/)?.[1] || 'converted.xlsx'
                setConvertedFiles([{
                    filename: filename,
                    blob: blob,
                    originalName: files[0].name
                }])
            } else {
                // JSON response fallback
                const responseData = await response.json()
                let result = typeof responseData.body === 'string'
                    ? JSON.parse(responseData.body)
                    : responseData.body || responseData

                const results = Array.isArray(result) ? result : [result]
                setConvertedFiles(results.map((r, i) => ({
                    filename: r.filename,
                    excelData: r.excelData,
                    originalName: files[i]?.name || r.originalName
                })))
            }
        } catch (err) {
            setError(err.message || "An error occurred during conversion")
            console.error("Conversion error:", err)
        } finally {
            setLoading(false)
        }
    }

    const handleDownloadSingle = (file) => {
        let blob
        if (file.blob) {
            blob = file.blob
        } else {
            // Fallback for base64 data
            const byteCharacters = atob(file.excelData)
            const byteNumbers = new Array(byteCharacters.length)
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i)
            }
            const byteArray = new Uint8Array(byteNumbers)
            blob = new Blob([byteArray], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            })
        }
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = file.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
    }

    const handleDownloadAll = async () => {
        for (const file of convertedFiles) {
            handleDownloadSingle(file)
            await new Promise(resolve => setTimeout(resolve, 300))
        }
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
                    Please upload one or more CSV files to convert them into Excel format.
                </Typography>

                <Divider sx={{ my: 3 }} />

                <Stack spacing={3} alignItems="center">
                    <Button
                        variant="outlined"
                        component="label"
                        startIcon={<UploadFileIcon />}
                        size="large"
                    >
                        Select Files
                        <input
                            type="file"
                            hidden
                            multiple
                            accept=".csv,.txt,text/csv,text/plain"
                            onChange={handleFileChange}
                        />
                    </Button>

                    {files.length > 0 && (
                        <>
                            <Typography variant="body2" color="text.secondary">
                                {files.length} file(s) selected
                            </Typography>
                            <List dense sx={{ width: '100%', maxHeight: 200, overflow: 'auto' }}>
                                {files.map((file, idx) => (
                                    <ListItem key={idx}>
                                        <ListItemText
                                            primary={file.name}
                                            secondary={`${(file.size / 1024).toFixed(2)} KB`}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </>
                    )}

                    {loading && (
                        <>
                            <LinearProgress sx={{ width: "100%" }} />
                            <Typography variant="body2" color="text.secondary">
                                Converting files...
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
                        disabled={loading || files.length === 0}
                    >
                        {loading ? "Converting..." : "Convert to Excel"}
                    </Button>

                    {convertedFiles.length > 0 && (
                        <>
                            {convertedFiles.length === 1 ? (
                                <Button
                                    variant="contained"
                                    color="success"
                                    size="large"
                                    startIcon={<DownloadIcon />}
                                    onClick={() => handleDownloadSingle(convertedFiles[0])}
                                >
                                    Download {convertedFiles[0].filename}
                                </Button>
                            ) : (
                                <>
                                    <Typography variant="body2" color="success.main">
                                        ✓ {convertedFiles.length} files converted successfully
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        color="success"
                                        size="large"
                                        startIcon={<DownloadIcon />}
                                        onClick={handleDownloadAll}
                                    >
                                        Download All Files
                                    </Button>
                                </>
                            )}
                        </>
                    )}
                </Stack>
            </Paper>
        </Container>
    )
}

export default Body