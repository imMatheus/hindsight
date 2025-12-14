import { Routes, Route } from 'react-router';
import Home from './pages/Home';
import Repo from './pages/Repo';
import NotFound from './pages/NotFound';

function App() {
  return (
    <Routes>
      <Route index element={<Home />} />
      <Route path="/:username/:repo" element={<Repo />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
