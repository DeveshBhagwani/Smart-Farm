/**
 * plant-health.js - Plant health analysis and image preview logic
 */

document.addEventListener('DOMContentLoaded', function() {
    const healthForm = document.getElementById('plant-health-form');
    const fileInput = document.getElementById('plant-image');
    const fileLabel = document.querySelector('.file-upload-label');
    
    // Add image preview container if it doesn't exist
    let previewContainer = document.getElementById('image-preview-container');
    if (!previewContainer && healthForm) {
        previewContainer = document.createElement('div');
        previewContainer.id = 'image-preview-container';
        previewContainer.style.marginTop = '15px';
        previewContainer.style.textAlign = 'center';
        
        // Insert after the file input group
        const formGroup = fileInput.closest('.form-group');
        if(formGroup) {
            formGroup.appendChild(previewContainer);
        }
    }

    if (fileInput && fileLabel) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                fileLabel.innerHTML = `<i class="fas fa-check"></i> ${file.name}`;
                fileLabel.style.background = '#d4edda';
                fileLabel.style.color = '#155724';
                
                // New Feature: Image Preview
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        previewContainer.innerHTML = `
                            <img src="${e.target.result}" alt="Plant Preview" 
                                 style="max-width: 100%; max-height: 250px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                        `;
                    };
                    reader.readAsDataURL(file);
                } else {
                    previewContainer.innerHTML = '';
                }
            } else {
                previewContainer.innerHTML = '';
            }
        });
    }
    
    if (healthForm) {
        healthForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const imageFile = fileInput.files[0];
            
            if (imageFile && imageFile.size > 0) {
                window.SmartFarm.showLoading(healthForm.querySelector('button'));
                analyzePlantHealth();
            } else {
                window.SmartFarm.showMessage('Please select an image to analyze.', 'error');
            }
        });
    }
});

async function analyzePlantHealth() {
    try {
        // Simulate an API call delay for analysis
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const healthScenarios = [
            {
                status: 'healthy',
                health: 'Healthy',
                confidence: 92,
                issues: 'No significant issues detected',
                recommendations: 'Continue current care routine. Maintain proper watering schedule.',
                icon: 'fa-check-circle'
            },
            {
                status: 'warning',
                health: 'Mild Concern',
                confidence: 78,
                issues: 'Possible nutrient deficiency detected',
                recommendations: 'Consider adding nitrogen-rich fertilizer. Monitor soil pH levels.',
                icon: 'fa-exclamation-triangle'
            },
            {
                status: 'danger',
                health: 'Needs Attention',
                confidence: 85,
                issues: 'Signs of pest damage and leaf spot disease',
                recommendations: 'Apply appropriate pesticide and fungicide. Improve air circulation.',
                icon: 'fa-exclamation-circle'
            }
        ];
        
        const result = healthScenarios[Math.floor(Math.random() * healthScenarios.length)];
        displayPlantHealthResult(result);
        window.SmartFarm.hideLoading();
        
    } catch (error) {
        window.SmartFarm.showMessage('Error analyzing plant health. Please try again.', 'error');
        window.SmartFarm.hideLoading();
    }
}

function displayPlantHealthResult(result) {
    const analysisResult = document.getElementById('analysis-result');
    
    if (analysisResult) {
        analysisResult.innerHTML = `
            <div class="health-status">
                <div class="status-icon status-${result.status}">
                    <i class="fas ${result.icon}"></i>
                </div>
                <div>
                    <h3>Plant Health: ${result.health}</h3>
                    <p>Confidence: ${result.confidence}%</p>
                </div>
            </div>
            <div class="analysis-details">
                <div class="detail-section">
                    <h4><i class="fas fa-search"></i> Issues Detected</h4>
                    <p>${result.issues}</p>
                </div>
                <div class="detail-section">
                    <h4><i class="fas fa-lightbulb"></i> Recommendations</h4>
                    <p>${result.recommendations}</p>
                </div>
            </div>
        `;
        
        analysisResult.classList.add('show');
        analysisResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
