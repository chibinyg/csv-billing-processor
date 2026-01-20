import Header from "./components/Header.jsx"
import CsvConverter from "./components/CsvConverter.jsx"
import Footer from "./components/Footer.jsx"
import { Box } from "@mui/material"

const App = () => {
  return (
    <Box display="flex" flexDirection="column" minHeight="100vh" sx={{ bgcolor: "grey.50" }} >
      <Header />
      <CsvConverter />
      <Footer />
    </Box>
  )
}

export default App
