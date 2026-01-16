import { Box, Typography } from "@mui/material"

const Footer = () => {
    return (
        <Box component="footer" sx={{ bgcolor: "grey.100", py: 2, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
                © {new Date().getFullYear()} Metro Physicians LLC. All rights reserved.
            </Typography>
        </Box>
    )
}

export default Footer