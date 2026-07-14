pipeline {
    agent any

    triggers {
        // ponytail: empty cron — activates on Forgejo notifyCommit push, never polls
        pollSCM('')
    }

    environment {
        SONAR_SERVER = "sonar"
        // Coolify > votre service > Webhooks > Deploy Webhook URL
        COOLIFY_WEBHOOK = "https://coolify.bluevaloris.com/api/v1/deploy?uuid=p7y8lcey15e26zdvoguol9qw&force=false"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Code Analysis (SonarQube)') {
            steps {
                script {
                    try {
                        def scannerHome = tool 'SonarScanner'
                        withSonarQubeEnv("${SONAR_SERVER}") {
                            sh "${scannerHome}/bin/sonar-scanner -Dsonar.projectKey=testBV"
                        }
                    } catch (Exception e) {
                        echo "SonarQube analysis failed or tool not found, skipping..."
                    }
                    // Wait for the Quality Gate result
                    /*timeout(time: 5, unit: 'MINUTES') {
                        def qg = waitForQualityGate()
                        if (qg.status != 'OK') {
                            error "Pipeline aborted due to quality gate failure: ${qg.status}"
                        }
                    }   */
                }
            }
        }

        stage('Trigger Coolify Deploy') {
            steps {
                echo 'Déclenchement du build et déploiement via Coolify...'
                withCredentials([string(credentialsId: 'COOLIFY_TOKEN', variable: 'COOLIFY_API_TOKEN')]) {
                    sh 'curl -s -w "\nHTTP Status: %{http_code}\n" -H "Authorization: Bearer $COOLIFY_API_TOKEN" -X GET "$COOLIFY_WEBHOOK"'
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            echo 'Pipeline testBV terminé avec succès ! Coolify prend le relais.'
        }
        failure {
            echo 'Le pipeline testBV a échoué. Coolify ne sera pas déclenché.'
        }
    }
}
