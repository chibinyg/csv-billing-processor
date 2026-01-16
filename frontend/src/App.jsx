import Header from "./components/Header.jsx"
import Body from "./components/Body.jsx"
import Footer from "./components/Footer.jsx"
import { Box } from "@mui/material"

const App = () => {
  return (
    <Box display="flex" flexDirection="column" minHeight="100vh" sx={{ bgcolor: "grey.50" }} >
      <Header />
      <Body />
      <Footer />
    </Box>
  )
}

export default App
