pipeline {
    agent any

    tools {
        nodejs 'Node20'   // must match the name configured in Manage Jenkins → Tools → NodeJS installations
    }

    environment {
        DOCKERHUB_USERNAME = "omarmo20"
        IMAGE_TAG           = "${BUILD_NUMBER}"
        SONAR_PROJECT_KEY   = "classtrack"
        K8S_NAMESPACE       = "default"
        ARTIFACT_DIR        = "artifacts"
    }
    // Note: the buildable-service list (name/context/image/build-args) is defined
    // via the services() helper function at the bottom of this file, and re-used
    // by the build, scan, push, and cleanup stages below.

    stages {

        // ── 1. Clone ──────────────────────────────────────────────────────
        stage('Clone Repository') {
            steps {
                echo '>>> Cloning repository...'
                // TODO: replace with the real ClassTrack repo URL/branch
                git branch: 'main',
                    url: 'https://github.com/<your-org>/team_5.git'
            }
        }

        // ── 2. Install Dependencies & Run Tests ───────────────────────────
        stage('Install Dependencies & Run Tests') {
            steps {
                echo '>>> Installing backend dependencies and running unit/integration tests...'
                sh '''
                    set -e

                    # The test harness (tests/, jest.config.js, .env.test) lives at the
                    # repo root but its requires ("../../src/...") expect to sit next to
                    # Backend/src, so we stage a copy inside Backend/ before running Jest.
                    rm -rf Backend/tests
                    cp -r tests Backend/tests
                    cp jest.config.js Backend/jest.config.js
                    if [ -f .env.test ]; then cp .env.test Backend/.env.test; fi

                    cd Backend
                    npm ci
                    npm install --no-save --no-audit --no-fund jest supertest mongodb-memory-server jest-junit

                    JEST_JUNIT_OUTPUT_DIR=./junit \
                    JEST_JUNIT_OUTPUT_NAME=results.xml \
                    npx jest --ci --coverage --coverageDirectory=coverage \
                        --reporters=default --reporters=jest-junit
                '''
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'Backend/junit/results.xml'
                    archiveArtifacts artifacts: 'Backend/coverage/**', allowEmptyArchive: true
                }
            }
        }

        // ── 3. SonarQube Analysis ─────────────────────────────────────────
        stage('SonarQube Analysis') {
            steps {
                echo '>>> Running SonarQube analysis...'
                withSonarQubeEnv('SonarQube') {
                    sh '''
                        sonar-scanner \
                          -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                          -Dsonar.projectName="ClassTrack" \
                          -Dsonar.sources=Backend,Frontend \
                          -Dsonar.exclusions=**/node_modules/**,**/.next/**,**/coverage/**,**/tests/**,**/junit/** \
                          -Dsonar.javascript.lcov.reportPaths=Backend/coverage/lcov.info
                    '''
                }
            }
        }

        // ── 4. Quality Gate ───────────────────────────────────────────────
        stage('Quality Gate') {
            steps {
                echo '>>> Waiting for SonarQube Quality Gate...'
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        // ── 5. Build Docker Images ─────────────────────────────────────────
        stage('Build Docker Images') {
            steps {
                script {
                    services().each { svc ->
                        stage("Build: ${svc.name}") {
                            def fullImage = "${DOCKERHUB_USERNAME}/${svc.image}:${IMAGE_TAG}"
                            echo ">>> Building Docker image: ${fullImage}"
                            if (svc.name == 'frontend') {
                                // Frontend needs its NEXT_PUBLIC_* vars baked in at build
                                // time. Pull real values from your Frontend/.env file
                                // (uploaded once as a Jenkins Secret File credential)
                                // instead of hardcoding them here or in git.
                                withCredentials([file(credentialsId: 'frontend-env-file', variable: 'FRONTEND_ENV_FILE')]) {
                                    sh """
                                        set -a
                                        . "\${FRONTEND_ENV_FILE}"
                                        set +a
                                        docker build \
                                          --build-arg NEXT_PUBLIC_API_URL="\${NEXT_PUBLIC_API_URL}" \
                                          --build-arg NEXT_PUBLIC_APP_NAME="\${NEXT_PUBLIC_APP_NAME}" \
                                          -t ${fullImage} ${svc.context}
                                    """
                                }
                            } else {
                                sh "docker build -t ${fullImage} ${svc.context}"
                            }
                        }
                    }
                }
            }
        }

        // ── 6. Trivy Security Scan ────────────────────────────────────────
        stage('Trivy Security Scan') {
            steps {
                script {
                    sh "mkdir -p trivy-reports"
                    services().each { svc ->
                        stage("Scan: ${svc.name}") {
                            def fullImage = "${DOCKERHUB_USERNAME}/${svc.image}:${IMAGE_TAG}"
                            echo ">>> Scanning image with Trivy: ${fullImage}"
                            sh """
                                trivy image \
                                  --exit-code 0 \
                                  --severity HIGH,CRITICAL \
                                  --format table \
                                  --output trivy-reports/${svc.name}.txt \
                                  ${fullImage}
                            """
                        }
                    }
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-reports/*.txt', allowEmptyArchive: true
                }
            }
        }

        // ── 7. Build Artifact ─────────────────────────────────────────────
        stage('Build Artifact') {
            steps {
                echo '>>> Packaging build artifact bundle...'
                sh '''
                    set -e
                    mkdir -p ${ARTIFACT_DIR}

                    cat > ${ARTIFACT_DIR}/build-info.txt <<EOF
Build Number : ${BUILD_NUMBER}
Image Tag    : ${IMAGE_TAG}
Git Commit   : ${GIT_COMMIT:-unknown}
Built On     : $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Images       :
  ${DOCKERHUB_USERNAME}/class-track-auth-service:${IMAGE_TAG}
  ${DOCKERHUB_USERNAME}/class-track-staff-service:${IMAGE_TAG}
  ${DOCKERHUB_USERNAME}/class-track-student-service:${IMAGE_TAG}
  ${DOCKERHUB_USERNAME}/class-track-api-gateway:${IMAGE_TAG}
  ${DOCKERHUB_USERNAME}/class-track-frontend:${IMAGE_TAG}
EOF

                    cp -r k8s ${ARTIFACT_DIR}/k8s-manifests
                    cp -r trivy-reports ${ARTIFACT_DIR}/trivy-reports || true
                    if [ -d Backend/coverage ]; then cp -r Backend/coverage ${ARTIFACT_DIR}/coverage; fi

                    tar -czf classtrack-build-${BUILD_NUMBER}.tar.gz -C ${ARTIFACT_DIR} .
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'classtrack-build-*.tar.gz', allowEmptyArchive: true
                }
            }
        }

        // ── 8. Push to Docker Hub ─────────────────────────────────────────
        stage('Push to Docker Hub') {
            steps {
                script {
                    withCredentials([usernamePassword(
                        credentialsId: 'dockerhub-credentials',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )]) {
                        sh 'echo "${DOCKER_PASS}" | docker login -u "${DOCKER_USER}" --password-stdin'
                        services().each { svc ->
                            stage("Push: ${svc.name}") {
                                def image = "${DOCKERHUB_USERNAME}/${svc.image}"
                                sh """
                                    docker push ${image}:${IMAGE_TAG}
                                    docker tag ${image}:${IMAGE_TAG} ${image}:latest
                                    docker push ${image}:latest
                                """
                            }
                        }
                    }
                }
            }
        }

        // ── 9. Remove Local Images ─────────────────────────────────────────
        stage('Remove Local Images') {
            steps {
                echo '>>> Removing local Docker images from build agent...'
                script {
                    services().each { svc ->
                        def image = "${DOCKERHUB_USERNAME}/${svc.image}"
                        sh """
                            docker rmi ${image}:${IMAGE_TAG} || true
                            docker rmi ${image}:latest || true
                        """
                    }
                }
                sh 'docker image prune -f || true'
            }
        }

        // ── 10. Deploy to Kubernetes ───────────────────────────────────────
        stage('Deploy to Kubernetes') {
            steps {
                echo '>>> Deploying to Kubernetes...'
                withCredentials([
                    file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG'),
                    file(credentialsId: 'backend-env-file', variable: 'BACKEND_ENV_FILE')   // your real Backend/.env, uploaded once in Jenkins
                ]) {
                    sh '''
                        export KUBECONFIG=${KUBECONFIG}

                        # Build the Secret straight from your .env file — no values
                        # typed into Jenkins, nothing committed to git.
                        kubectl create secret generic backend-secret \
                            --from-env-file="${BACKEND_ENV_FILE}" \
                            --namespace=${K8S_NAMESPACE} \
                            --dry-run=client -o yaml | kubectl apply -f -

                        # Apply all manifests (Deployments, Services, PVC, Ingress)
                        kubectl apply -f k8s/ --namespace=${K8S_NAMESPACE}

                        # Point each deployment at the image just built and pushed
                        kubectl set image deployment/auth-service-deployment \
                            auth-service=${DOCKERHUB_USERNAME}/class-track-auth-service:${IMAGE_TAG} \
                            --namespace=${K8S_NAMESPACE}

                        kubectl set image deployment/staff-service-deployment \
                            staff-service=${DOCKERHUB_USERNAME}/class-track-staff-service:${IMAGE_TAG} \
                            --namespace=${K8S_NAMESPACE}

                        kubectl set image deployment/student-service-deployment \
                            student-service=${DOCKERHUB_USERNAME}/class-track-student-service:${IMAGE_TAG} \
                            --namespace=${K8S_NAMESPACE}

                        kubectl set image deployment/api-gateway-deployment \
                            api-gateway=${DOCKERHUB_USERNAME}/class-track-api-gateway:${IMAGE_TAG} \
                            --namespace=${K8S_NAMESPACE}

                        kubectl set image deployment/frontend-deployment \
                            frontend=${DOCKERHUB_USERNAME}/class-track-frontend:${IMAGE_TAG} \
                            --namespace=${K8S_NAMESPACE}

                        # Wait for every rollout to finish
                        for d in auth-service-deployment staff-service-deployment student-service-deployment api-gateway-deployment frontend-deployment; do
                            kubectl rollout status deployment/$d --namespace=${K8S_NAMESPACE} --timeout=180s
                        done

                        echo ">>> Deployment complete!"
                        kubectl get pods --namespace=${K8S_NAMESPACE}
                    '''
                }
            }
        }
    }

    // ── Post Actions ──────────────────────────────────────────────────────
    post {
        success {
            echo """
            ============================================
             Pipeline SUCCESS
             Build  : #${BUILD_NUMBER}
             Images : ${DOCKERHUB_USERNAME}/class-track-{auth,staff,student}-service,
                      ${DOCKERHUB_USERNAME}/class-track-api-gateway,
                      ${DOCKERHUB_USERNAME}/class-track-frontend  (tag: ${IMAGE_TAG})
            ============================================
            """
        }
        failure {
            echo """
            ============================================
             Pipeline FAILED at stage: ${env.STAGE_NAME}
             Check the logs above for details.
            ============================================
            """
            sh 'docker image prune -f || true'
        }
        always {
            cleanWs()
        }
    }
}

// Buildable services: name, Docker build context, Docker Hub image repo,
// and (for the frontend) the build args baked in at image-build time.
// Container/deployment names in k8s/*-deployment.yaml match `name` exactly.
def services() {
    return [
        [name: 'auth-service',   context: 'Backend/services/auth-service',   image: 'class-track-auth-service'],
        [name: 'staff-service',  context: 'Backend/services/staff-service',  image: 'class-track-staff-service'],
        [name: 'student-service',context: 'Backend/services/student-service',image: 'class-track-student-service'],
        [name: 'api-gateway',    context: 'Backend/services/api-gateway',    image: 'class-track-api-gateway'],
        [name: 'frontend',       context: 'Frontend',                        image: 'class-track-frontend']
    ]
}