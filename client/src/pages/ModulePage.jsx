import { useParams } from "react-router-dom";

function ModulePage() {
  const { id } = useParams();

  return (
    <div>
      <h1>Module {id}</h1>
    </div>
  );
}

export default ModulePage;