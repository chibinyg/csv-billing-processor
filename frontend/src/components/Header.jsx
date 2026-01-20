import logo from '../assets/metro-logo.jpg'
import { AppBar, Toolbar, Typography, Box } from '@mui/material'

const Header = () => {
    return (
        <AppBar position="static" color="inherit" elevation={0} >
            <Toolbar>
                <Box
                    component="img"
                    src={logo}
                    alt="Metro Physicians Logo"
                    sx={{ height: 60, mr: 2 }}
                />
                <Typography variant="h5" fontWeight={400}>
                    CSV Converter
                </Typography>
            </Toolbar>
        </AppBar>
    )
}

export default Header