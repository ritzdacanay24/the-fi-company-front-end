# Making Users Folder Public in S3

The bucket `fi-dashboard-bucket-dev` is private by default, but user photos need to be publicly readable.

## Step 0: Disable Block Public Access (REQUIRED FIRST)

AWS has **Block Public Access** enabled on your account/bucket, which prevents public bucket policies from being applied.

1. Go to **AWS S3 Console** → **Block Public Access settings** (account level)
   - https://us-west-1.console.aws.amazon.com/s3/settings?region=us-west-1
2. Click **Edit**
3. **Uncheck** "Block public and cross-account access if bucket has a public policy"
4. Click **Save changes**
5. Repeat for bucket-level Block Public Access settings:
   - Go to **fi-dashboard-bucket-dev** → **Permissions** → **Block public access (bucket settings)**
   - https://us-west-1.console.aws.amazon.com/s3/bucket/fi-dashboard-bucket-dev/property/bpa/edit?region=us-west-1
   - **Uncheck** "Block public and cross-account access if bucket has a public policy"
   - Click **Save changes**

⚠️ **Note**: This is safe because the bucket policy only allows public read access to the `users/` folder, not the entire bucket.

## Option 1: AWS Console (Quick)

1. Go to **AWS S3 Console** → `fi-dashboard-bucket-dev`
2. Click **Permissions** tab
3. Scroll to **Bucket policy**
4. Click **Edit**
5. Paste the policy from [s3-bucket-policy-users-public.json](./s3-bucket-policy-users-public.json)
6. Click **Save changes**

## Option 2: AWS CLI

```bash
aws s3api put-bucket-policy \
  --bucket fi-dashboard-bucket-dev \
  --policy file://s3-bucket-policy-users-public.json \
  --region us-west-1
```

## Option 3: Terraform (Infrastructure as Code)

If you use Terraform, add this to your S3 bucket resource:

```hcl
resource "aws_s3_bucket_policy" "allow_public_users" {
  bucket = aws_s3_bucket.fi_dashboard_bucket_dev.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObjectForUsers"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "arn:aws:s3:::fi-dashboard-bucket-dev/users/*"
      }
    ]
  })
}
```

## What This Does

- Allows anonymous (unauthenticated) users to **read** files in the `users/` folder
- Does **NOT** allow them to list, write, delete, or access other bucket folders
- User photos at URLs like `/attachments/1/photo-file.jpg` will be accessible without signed URLs

## Verification

Once applied, test by opening a user photo URL in your browser:
- Example: `https://s3.us-west-1.amazonaws.com/fi-dashboard-bucket-dev/users/329/photo.jpg`
- Should load the image without authentication
