document.addEventListener('DOMContentLoaded', function() {
    // Verificar se existe ID na URL
    const urlParams = new URLSearchParams(window.location.search);
    const docId = urlParams.get('id');
    
    if (docId) {
        document.getElementById('documentId').value = docId;
        validateById(docId);
    }

    // Configurar listener para upload de arquivo
    document.getElementById('pdfInput').addEventListener('change', handleFileUpload);
});

function validateById(id) {
    // Simular chamada à API - substitua pelo endpoint real
    fetch(`/api/validar/${id}`)
        .then(response => response.json())
        .then(data => {
            if (data.valid) {
                showValidationResult(true, `
                    <div class="mb-3">
                        <h5>✅ Assinatura Digital Verificada</h5>
                        <p>Este documento foi assinado digitalmente em ${new Date(data.timestamp).toLocaleString('pt-BR')}.</p>
                        <p><strong>ID do documento:</strong> ${data.documentId}</p>
                    </div>
                `);
            } else {
                showValidationResult(false, `
                    <div class="mb-3">
                        <h5>❌ Documento não encontrado</h5>
                        <p>Não foi possível encontrar um documento válido com este ID.</p>
                    </div>
                `);
            }
        })
        .catch(error => {
            console.error('Erro na validação:', error);
            showValidationResult(false, `
                <div class="mb-3">
                    <h5>❌ Erro na validação</h5>
                    <p>Ocorreu um erro ao tentar validar o documento.</p>
                </div>
            `);
        });
}

async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        // ... resto do código existente de validação de arquivo ...
    } catch (error) {
        console.error('Erro no upload:', error);
        showValidationResult(false, `
            <div class="mb-3">
                <h5>❌ Erro ao processar arquivo</h5>
                <p>Não foi possível processar este arquivo PDF.</p>
            </div>
        `);
    }
}

function showValidationResult(isValid, message) {
    // ... código existente da função showValidationResult ...
}
