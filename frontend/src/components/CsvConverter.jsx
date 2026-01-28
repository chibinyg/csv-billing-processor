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
import JSZip from "jszip"

// API endpoint for CSV to Excel conversion
const API_URL = import.meta.env.VITE_API_URL

const CsvConverter = () => {
    // State for selected files, loading status, error messages, and converted results
    const [files, setFiles] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [convertedFiles, setConvertedFiles] = useState([])
    const [isDragging, setIsDragging] = useState(false)
    const [progress, setProgress] = useState({ current: 0, total: 0 })

    // Handles file input change - adds new files to existing selection
    const handleFileChange = (e) => {
        const newFiles = Array.from(e.target.files).filter(isValidFileType)
        if (newFiles.length > 0) {
            setFiles(prev => [...prev, ...newFiles])
            setError("")
            setConvertedFiles([])
        }
        e.target.value = ""
    }

    // Clears a specific file by index
    const handleClearFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
        setConvertedFiles([])
    }

    // Clears all files
    const handleClearAll = () => {
        setFiles([])
        setError("")
        setConvertedFiles([])
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

    // Handles file drop - supports multiple files
    const handleDrop = (e) => {
        e.preventDefault()
        setIsDragging(false)
        const droppedFiles = Array.from(e.dataTransfer.files)
        const validFiles = droppedFiles.filter(isValidFileType)
        const invalidCount = droppedFiles.length - validFiles.length

        if (validFiles.length > 0) {
            setFiles(prev => [...prev, ...validFiles])
            setConvertedFiles([])
        }
        if (invalidCount > 0) {
            setError(`${invalidCount} file(s) skipped - only CSV and TXT files are accepted`)
        } else {
            setError("")
        }
    }

    // Converts a single file and returns the result
    const convertFile = async (file) => {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch(API_URL, {
            method: "POST",
            body: formData,
            headers: {
                'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }
        })

        if (!response.ok) {
            throw new Error(`Failed to convert ${file.name}: ${response.statusText}`)
        }

        const blob = await response.blob()
        const filename = response.headers.get('content-disposition')
            ?.match(/filename="([^"]+)"/)?.[1] || file.name.replace(/\.(csv|txt)$/i, '.xlsx')

        return { filename, blob }
    }

    // Handles conversion of all files in parallel
    const handleConvert = async () => {
        setLoading(true)
        setError("")
        setConvertedFiles([])
        setProgress({ current: 0, total: files.length })

        try {
            const results = []
            for (let i = 0; i < files.length; i++) {
                const result = await convertFile(files[i])
                results.push(result)
                setProgress({ current: i + 1, total: files.length })
            }
            setConvertedFiles(results)
        } catch (err) {
            setError(err.message || "An error occurred during conversion")
            console.error("Conversion error:", err)
        } finally {
            setLoading(false)
        }
    }

    // Triggers download - single file as xlsx, multiple files as zip
    const handleDownload = async () => {
        if (convertedFiles.length === 0) return

        if (convertedFiles.length === 1) {
            const { filename, blob } = convertedFiles[0]
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.download = filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
        } else {
            const zip = new JSZip()
            convertedFiles.forEach(({ filename, blob }) => {
                zip.file(filename, blob)
            })
            const zipBlob = await zip.generateAsync({ type: "blob" })
            const url = URL.createObjectURL(zipBlob)
            const link = document.createElement("a")
            link.href = url
            link.download = "converted_files.zip"
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
        }
    }

    return (
        <Container maxWidth="md" sx={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Paper elevation={3} sx={{ p: 3, width: "100%" }}>
                <Typography
                    variant="h6"
                    component="h1"
                    gutterBottom
                    textAlign="center"
                >
                    Upload CSV files and download as Excel
                </Typography>
                <Typography
                    variant="body1"
                    color="text.secondary"
                    textAlign="center"
                    gutterBottom
                >
                    Fast CSV to Excel conversion
                </Typography>

                <Divider sx={{ my: 3 }} />

                <Stack spacing={3} alignItems="center">
                    <Box
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        sx={{
                            border: '2px dashed',
                            borderColor: isDragging ? 'primary.main' : 'grey.400',
                            borderRadius: 5,
                            p: 4,
                            textAlign: 'center',
                            bgcolor: isDragging ? 'action.hover' : 'transparent',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
                            maxWidth: 400,
                        }}
                    >
                        <UploadFileIcon sx={{ fontSize: 48, color: 'grey.500', mb: 1 }} />
                        <Typography variant="body1" color="text.secondary" gutterBottom>
                            Drop your files here (.csv, .txt)
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
                                multiple
                                accept=".csv,.txt,text/csv,text/plain"
                                onChange={handleFileChange}
                            />
                        </Button>
                    </Box>

                    {files.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                            {files.map((file, index) => (
                                <Chip
                                    key={`${file.name}-${index}`}
                                    icon={<InsertDriveFileIcon />}
                                    label={`${file.name} (${(file.size / 1024).toFixed(2)} KB)`}
                                    onDelete={() => handleClearFile(index)}
                                    color="primary"
                                    variant="outlined"
                                    size="small"
                                />
                            ))}
                            {files.length > 1 && (
                                <Chip
                                    label="Clear All"
                                    onClick={handleClearAll}
                                    color="error"
                                    variant="outlined"
                                    size="small"
                                />
                            )}
                        </Box>
                    )}

                    {loading && (
                        <>
                            <LinearProgress sx={{ width: "100%" }} />
                            <Typography variant="body2" color="text.secondary">
                                Converting {progress.current}/{progress.total}...
                            </Typography>
                        </>
                    )}

                    {error && (
                        <Typography color="error" variant="body2">
                            {error}
                        </Typography>
                    )}

                    {convertedFiles.length === 0 && (
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleConvert}
                            disabled={loading || files.length === 0}
                        >
                            {loading ? "Converting..." : `Convert ${files.length || ''} File${files.length !== 1 ? 's' : ''} to Excel`}
                        </Button>
                    )}

                    {convertedFiles.length > 0 && (
                        <Button
                            variant="contained"
                            color="success"
                            size="large"
                            startIcon={<DownloadIcon />}
                            onClick={handleDownload}
                        >
                            {convertedFiles.length === 1
                                ? `Download ${convertedFiles[0].filename}`
                                : `Download ${convertedFiles.length} Files (ZIP)`}
                        </Button>
                    )}
                </Stack>
            </Paper>
        </Container>
    )
}

export default CsvConverter